import { confidenceWord, formatConfidence } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export function ConfidenceBadge({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const word = confidenceWord(value);
  const tone =
    word === "High" ? "text-sage border-sage/30" : word === "Moderate" ? "text-brass border-brass/30" : "text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wide",
        tone,
        className,
      )}
    >
      <span>{word}</span>
      <span aria-hidden>·</span>
      <span>{formatConfidence(value)}</span>
      <span className="sr-only">confidence</span>
    </span>
  );
}
