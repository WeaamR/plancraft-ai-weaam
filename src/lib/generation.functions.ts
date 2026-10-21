import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
    if (req.status === "processing")
      return { ok: false, connected: true, message: "This plan is already being generated." };

    await db.from("project_requests").update({ status: "processing" }).eq("id", data.id);
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      const secret = process.env["N8N_WEBHOOK_SECRET"];
      if (secret) headers["x-webhook-secret"] = secret;
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          request_id: req.id,
          title: req.title,
          description: req.description,
          goal: req.goal,
          additional_context: req.additional_context,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`n8n responded ${res.status}`);
      return { ok: true, connected: true, message: "Generation started. This page will update when the plan is ready." };
    } catch (e) {
      console.error(e);
      await db.from("project_requests").update({ status: "failed" }).eq("id", data.id);
      return { ok: false, connected: true, message: "Could not reach the automation service. Please try again later." };
    }
  });
