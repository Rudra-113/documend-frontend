import type { CoverageRowModel } from "@/lib/types/domain";
import { formatINR } from "@/lib/utils/format";
import { COVERAGE_STATUS_LABEL } from "@/lib/utils/labels";

const TONE: Record<CoverageRowModel["status"], string> = {
  payable: "text-sage",
  partial: "text-brass",
  denied: "text-clay",
  review: "text-steel",
  missing_policy: "text-muted-foreground",
};

export function CoverageRow({ row }: { row: CoverageRowModel }) {
  return (
    <article className="grid gap-3 border-b border-border py-4 md:grid-cols-[minmax(0,1.5fr)_repeat(3,90px)_110px] md:items-start">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{row.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {row.category} · {row.rule}
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{row.reason}</p>
        {row.clause ? <p className="mt-1 font-mono text-[10px] text-brass">{row.clause}</p> : null}
      </div>
      <p className="font-mono text-sm">
        <span className="mr-2 text-[10px] text-muted-foreground md:hidden">Billed</span>
        {formatINR(row.billed)}
      </p>
      <p className="font-mono text-sm">
        <span className="mr-2 text-[10px] text-muted-foreground md:hidden">Allowed</span>
        {formatINR(row.allowed)}
      </p>
      <p className="font-mono text-sm">
        <span className="mr-2 text-[10px] text-muted-foreground md:hidden">Refused</span>
        {formatINR(row.denied + row.review)}
      </p>
      <p className={`text-xs ${TONE[row.status]}`}>{COVERAGE_STATUS_LABEL[row.status]}</p>
    </article>
  );
}
