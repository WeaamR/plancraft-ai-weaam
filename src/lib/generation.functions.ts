import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { isAlreadyGenerated, isGenerationLocked } from "./generation-rules";

/**
 * Integration point for n8n Cloud. Reads N8N_WEBHOOK_URL (and optional
 * N8N_WEBHOOK_SECRET) from server env. Until those are configured it returns
 * { connected: false } — it never fabricates a plan.
 */
export const triggerPlanGeneration = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => ({ id: z.string().uuid().parse(input.id) }))
  .handler(async ({ data }) => {
    const webhookUrl = process.env["N8N_WEBHOOK_URL"];
    if (!webhookUrl) {
      return {
        ok: false,
        connected: false,
        message: "Plan generation is not connected yet. The n8n workflow still needs to be configured.",
      };
    }
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: req } = await db.from("project_requests").select("*").eq("id", data.id).maybeSingle();
    if (!req) return { ok: false, connected: true, message: "Request not found." };

    const { data: existingPlan } = await db
      .from("project_plans").select("id").eq("request_id", data.id).maybeSingle();
    if (isAlreadyGenerated(req.status, !!existingPlan))
      return { ok: false, connected: true, message: "This plan has already been generated." };

    if (isGenerationLocked(req.status, req.updated_at))
      return { ok: false, connected: true, message: "This plan is already being generated." };

    // Atomic claim: only one caller can move the request into "processing",
    // so double clicks / parallel calls can never start two n8n runs.
    const { data: claimed } = await db
      .from("project_requests")
      .update({ status: "processing" })
      .eq("id", data.id)
      .eq("status", req.status)
      .eq("updated_at", req.updated_at)
      .select("id");
    if (!claimed || claimed.length === 0)
      return { ok: false, connected: true, message: "This plan is already being generated." };

    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      const secret = process.env["N8N_WEBHOOK_SECRET"];
      if (secret) headers["x-webhook-secret"] = secret;
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ request_id: req.id }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`n8n responded ${res.status}: ${await res.text().catch(() => "")}`);
      return { ok: true, connected: true, message: "Generation started. This page will update when the plan is ready." };
    } catch (e) {
      console.error("[n8n] webhook call failed", e);
      await db.from("project_requests").update({ status: "failed" }).eq("id", data.id).eq("status", "processing");
      return { ok: false, connected: true, message: "Could not reach the automation service. Please try again later." };
    }
  });
