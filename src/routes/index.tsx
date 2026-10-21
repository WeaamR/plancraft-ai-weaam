import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, formatDate } from "@/components/StatusBadge";
import { createProjectRequest, listProjectRequests } from "@/lib/plans.functions";

export const requestsQuery = queryOptions({
  queryKey: ["project_requests"],
  queryFn: () => listProjectRequests(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PlanCraft AI — Turn your ideas into actionable plans" },
      { name: "description", content: "Describe your idea, generate a structured plan, and review practical next steps." },
      { property: "og:title", content: "PlanCraft AI" },
      { property: "og:description", content: "Turn your ideas into actionable plans." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
      <header className="mb-10">
        <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <Sparkles className="h-4 w-4" /> PlanCraft AI
        </p>
        <h1 className="text-4xl font-semibold sm:text-5xl">Turn your ideas into actionable plans.</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          Transform your ideas into structured plans and practical next steps.
        </p>
        <ol className="mt-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <li>1. Describe your idea</li><ArrowRight className="h-3 w-3" />
          <li>2. Generate a plan</li><ArrowRight className="h-3 w-3" />
          <li>3. Review the result</li>
        </ol>
      </header>
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <CreateForm />
        <MyPlans />
      </div>
    </main>
  );
}

function CreateForm() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", description: "", goal: "", additional_context: "" });
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});
  const [savedId, setSavedId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => createProjectRequest({ data: form }),
    onSuccess: (row) => {
      setSavedId(row.id);
      setForm({ title: "", description: "", goal: "", additional_context: "" });
      qc.invalidateQueries({ queryKey: ["project_requests"] });
      toast.success("Request saved");
    },
    onError: (e: Error) => toast.error(e.message || "Could not save your request."),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mutation.isPending) return;
    const next: typeof errors = {};
    if (!form.title.trim()) next.title = "Please enter a project title.";
    if (!form.description.trim()) next.description = "Please describe your idea.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSavedId(null);
    mutation.mutate();
  };

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm" aria-labelledby="create-heading">
      <h2 id="create-heading" className="text-2xl font-semibold">Create a plan</h2>
      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="title">Project Title *</Label>
          <Input id="title" value={form.title} onChange={set("title")} maxLength={200}
            placeholder="Launch a Handmade Accessories Store" aria-invalid={!!errors.title} />
          {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Project Description *</Label>
          <Textarea id="description" rows={5} value={form.description} onChange={set("description")} maxLength={5000}
            placeholder="Explain your idea and what you want to achieve." aria-invalid={!!errors.description} />
          {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="goal">Main Goal</Label>
          <Input id="goal" value={form.goal} onChange={set("goal")} maxLength={1000} placeholder="Optional" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="context">Additional Context</Label>
          <Textarea id="context" rows={3} value={form.additional_context} onChange={set("additional_context")}
            maxLength={5000} placeholder="Constraints, budget, audience, or other useful details (optional)" />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Generate My Plan"}
        </Button>
        {savedId && (
          <div role="status" className="rounded-lg bg-secondary p-4 text-sm text-secondary-foreground">
            Your request has been saved. AI plan generation will become available once the n8n
            automation is connected.{" "}
            <Link to="/plans/$id" params={{ id: savedId }} className="font-semibold underline">View request</Link>
          </div>
        )}
      </form>
    </section>
  );
}

function MyPlans() {
  const { data, isLoading, isError, refetch } = useQuery(requestsQuery);
  return (
    <section aria-labelledby="plans-heading">
      <h2 id="plans-heading" className="text-2xl font-semibold">My Plans</h2>
      <div className="mt-5 space-y-3">
        {isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        {isError && (
          <div className="rounded-xl border border-destructive/30 p-4 text-sm">
            Could not load your plans.{" "}
            <button className="font-semibold underline" onClick={() => refetch()}>Try again</button>
          </div>
        )}
        {data && data.length === 0 && (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            No plans yet. Describe your first idea to get started.
          </div>
        )}
        {data?.map((r) => (
          <Link key={r.id} to="/plans/$id" params={{ id: r.id }}
            className="block rounded-xl border bg-card p-4 transition-colors hover:border-primary">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold">{r.title}</h3>
              <StatusBadge status={r.status} />
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
