"use client";

import { useMemo, useState } from "react";
import type { DocumentRecord, Finding, FindingType } from "@/lib/types/domain";
import { FindingCard } from "@/components/findings/FindingCard";
import { FINDING_TYPE_LABEL } from "@/lib/utils/labels";

const FILTERS: Array<{ id: "all" | FindingType; label: string }> = [
  { id: "all", label: "All" },
  { id: "duplicate", label: FINDING_TYPE_LABEL.duplicate },
  { id: "quantity_anomaly", label: FINDING_TYPE_LABEL.quantity_anomaly },
  { id: "contradiction", label: FINDING_TYPE_LABEL.contradiction },
  { id: "missing_document", label: FINDING_TYPE_LABEL.missing_document },
  { id: "non_payable", label: FINDING_TYPE_LABEL.non_payable },
  { id: "coverage_gap", label: FINDING_TYPE_LABEL.coverage_gap },
];

export function FindingsView({
  findings,
  documents,
  activeId,
  onOpen,
}: {
  findings: Finding[];
  documents: DocumentRecord[];
  activeId: string | null;
  onOpen: (findingId: string) => void;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const visible = useMemo(
    () => (filter === "all" ? findings : findings.filter((finding) => finding.type === filter)),
    [filter, findings],
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">Findings</p>
          <h2 className="mt-1 font-serif text-3xl">What does not agree</h2>
        </div>
        <p className="max-w-sm text-xs leading-5 text-muted-foreground">
          Amounts are the exposure on that finding. They overlap — a glove line can be both a quantity problem and a non-payable.
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="toolbar" aria-label="Filter findings">
        {FILTERS.map((item) => {
          const count = item.id === "all" ? findings.length : findings.filter((finding) => finding.type === item.id).length;
          const selected = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setFilter(item.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                selected ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
              <span className="ml-1.5 font-mono">{count}</span>
            </button>
          );
        })}
      </div>
      {visible.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">Nothing on this filter.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {visible.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              documents={documents}
              active={activeId === finding.id}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}
