import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, formatDate } from "@/components/StatusBadge";
import { getProjectRequest } from "@/lib/plans.functions";
import { triggerPlanGeneration } from "@/lib/generation.functions";
import { parseList, parsePhases } from "@/lib/plan-shape";

const detailQuery = (id: string) =>
  queryOptions({ queryKey: ["project_request", id], queryFn: () => getProjectRequest({ data: { id } }) });

export const Route = createFileRoute("/plans/$id")({
  head: () => ({
    meta: [
      { title: "Plan details — PlanCraft AI" },
      { name: "description", content: "Review your project request and its structured plan." },
      { property: "og:title", content: "Plan details — PlanCraft AI" },
      { property: "og:description", content: "Review your project request and its structured plan." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Details,
});

function Details() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    ...detailQuery(id),
    refetchInterval: (q) => (q.state.data?.request?.status === "processing" ? 5000 : false),
  });
  const gen = useMutation({
    mutationFn: () => triggerPlanGeneration({ data: { id } }),
    onSuccess: (r) => {
      (r.ok ? toast.success : toast.info)(r.message);
      qc.invalidateQueries({ queryKey: ["project_request", id] });
    },
    onError: () => toast.error("Something went wrong. Please try again."),
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to My Plans
      </Link>
      {isLoading && <Skeleton className="mt-6 h-64 rounded-2xl" />}
      {isError && (
        <p className="mt-6 text-sm">Could not load this request.{" "}
          <button className="font-semibold underline" onClick={() => refetch()}>Try again</button></p>
      )}
      {data && !data.request && <p className="mt-6 text-muted-foreground">This request could not be found.</p>}
      {data?.request && (
        <>
          <section className="mt-6 rounded-2xl border bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-3xl font-semibold">{data.request.title}</h1>
              <StatusBadge status={data.request.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Created {formatDate(data.request.created_at)}</p>
            <Field label="Description" value={data.request.description} />
            <Field label="Main goal" value={data.request.goal} />
            <Field label="Additional context" value={data.request.additional_context} />
            <Button className="mt-6" onClick={() => gen.mutate()}
              disabled={gen.isPending || data.request.status === "processing"}>
              {gen.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Generate My Plan
            </Button>
          </section>
          {data.plan ? <PlanView plan={data.plan} /> : (
            <div className="mt-6 rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
              This request has been saved. AI plan generation will be available once the n8n workflow is connected.
            </div>
          )}
        </>
      )}
    </main>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="mt-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>{label}</h2>
      <p className="mt-1 whitespace-pre-line">{value}</p>
    </div>
  );
}

type PlanRow = {
  summary: string; project_goal: string | null; phases: unknown;
  recommended_actions: unknown; risks: unknown; estimated_duration: string | null;
};

function PlanView({ plan }: { plan: PlanRow }) {
  const phases = parsePhases(plan.phases);
  const actions = parseList(plan.recommended_actions);
  const risks = parseList(plan.risks);
  return (
    <section className="mt-6 space-y-6">
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-semibold">Your plan</h2>
          {plan.estimated_duration && (
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> {plan.estimated_duration}
            </span>
          )}
        </div>
        <p className="mt-3 whitespace-pre-line">{plan.summary}</p>
        {plan.project_goal && <Field label="Project goal" value={plan.project_goal} />}
      </div>
      {phases.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold">Execution phases</h2>
          <ol className="mt-3 space-y-3">
            {phases.map((p, i) => (
              <li key={i} className="rounded-xl border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{i + 1}. {p.title ?? `Phase ${i + 1}`}</h3>
                  {p.priority && <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">{p.priority}</span>}
                </div>
                {p.objective && <p className="mt-1 text-sm font-medium text-primary">{p.objective}</p>}
                {p.description && <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>}
                {p.actions.length > 0 && (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{p.actions.map((a, j) => <li key={j}>{a}</li>)}</ul>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
      {actions.length > 0 && <ListCard title="Recommended actions" items={actions} />}
      {risks.length > 0 && <ListCard title="Risks and considerations" items={risks} />}
    </section>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}
