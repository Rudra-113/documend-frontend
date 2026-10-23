import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-2 text-foreground", className)}>
      <span className="font-serif text-[1.15rem] leading-none tracking-tight">DocuMend</span>
      <span className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground">LEDGER</span>
    </span>
  );
}
