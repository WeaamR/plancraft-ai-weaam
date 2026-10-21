import { Badge } from "@/components/ui/badge";

const LABELS = { pending: "Pending", processing: "Processing", completed: "Completed", failed: "Failed" } as const;
type Status = keyof typeof LABELS;

export function StatusBadge({ status }: { status: string }) {
  const s: Status = status in LABELS ? (status as Status) : "pending";
  return <Badge variant={s}>{LABELS[s]}</Badge>;
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
