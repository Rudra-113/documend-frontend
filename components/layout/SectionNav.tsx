"use client";

import { useRef } from "react";

export const CASE_VIEWS = [
  { id: "intelligence", label: "Intelligence" },
  { id: "findings", label: "Findings" },
  { id: "insurance", label: "Insurance" },
  { id: "evidence", label: "Evidence" },
  { id: "documents", label: "Documents" },
  { id: "ask", label: "Ask" },
  { id: "report", label: "Audit" },
] as const;

export type CaseView = (typeof CASE_VIEWS)[number]["id"];

export function SectionNav({
  value,
  onChange,
  counts,
}: {
  value: CaseView;
  onChange: (view: CaseView) => void;
  counts?: Partial<Record<CaseView, number>>;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function move(current: number, direction: number) {
    const next = (current + direction + CASE_VIEWS.length) % CASE_VIEWS.length;
    refs.current[next]?.focus();
    onChange(CASE_VIEWS[next].id);
  }

  return (
    <div
      role="tablist"
      aria-label="Case sections"
      className="flex gap-1 overflow-x-auto px-4 md:px-6"
    >
      {CASE_VIEWS.map((view, index) => {
        const selected = value === view.id;
        const count = counts?.[view.id];
        return (
          <button
            key={view.id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`tab-${view.id}`}
            aria-selected={selected}
            aria-controls={`panel-${view.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(view.id)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                move(index, 1);
              }
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                move(index, -1);
              }
              if (event.key === "Home") {
                event.preventDefault();
                refs.current[0]?.focus();
                onChange(CASE_VIEWS[0].id);
              }
              if (event.key === "End") {
                event.preventDefault();
                const last = CASE_VIEWS.length - 1;
                refs.current[last]?.focus();
                onChange(CASE_VIEWS[last].id);
              }
            }}
            className={`relative shrink-0 px-3 py-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              selected ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {view.label}
            {typeof count === "number" ? (
              <span className="ml-2 font-mono text-[10px] text-muted-foreground">{count}</span>
            ) : null}
            {selected ? <span className="absolute inset-x-3 bottom-0 h-px bg-foreground" /> : null}
          </button>
        );
      })}
    </div>
  );
}
