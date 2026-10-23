import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "sage" | "brass" | "clay";
}) {
  const accent =
    tone === "sage" ? "text-sage" : tone === "brass" ? "text-brass" : tone === "clay" ? "text-clay" : "text-foreground";
  return (
    <article className="panel px-4 py-3">
      <p className="kicker">{label}</p>
      <p className={cn("mt-2 font-mono text-lg tracking-tight", accent)}>{value}</p>
      {hint ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </article>
  );
}
