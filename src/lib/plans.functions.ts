import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// All database access runs server-side with the service role. The tables have RLS
// enabled with no public policies, so browsers cannot read or write them directly.
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(5000),
  goal: z.string().trim().max(1000).optional().nullable(),
  additional_context: z.string().trim().max(5000).optional().nullable(),
});

export const createProjectRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: row, error } = await db
      .from("project_requests")
      .insert({
        title: data.title,
        description: data.description,
        goal: data.goal || null,
        additional_context: data.additional_context || null,
      })
      .select("id")
      .single();
    if (error) throw new Error("Could not save your request. Please try again.");
    return row;
  });

export const listProjectRequests = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { data, error } = await db
    .from("project_requests")
    .select("id, title, description, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Could not load your plans.");
  return data;
});

export const getProjectRequest = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => ({ id: z.string().uuid().parse(input.id) }))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: request, error } = await db
      .from("project_requests")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error("Could not load this request.");
    if (!request) return { request: null, plan: null };
    const { data: plan } = await db
      .from("project_plans")
      .select("*")
      .eq("request_id", data.id)
      .maybeSingle();
    return { request, plan };
  });
