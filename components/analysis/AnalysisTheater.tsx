"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { DocumentRecord, PipelineState } from "@/lib/types/domain";
import { AnalysisTimeline } from "@/components/analysis/AnalysisTimeline";
import { STAGE_LABEL } from "@/lib/utils/labels";

export function AnalysisTheater({
  pipeline,
  documents,
}: {
  pipeline: PipelineState;
  documents: DocumentRecord[];
}) {
  const reduce = useReducedMotion();
  const feedRef = useRef<HTMLOListElement>(null);
  const last = pipeline.events[pipeline.events.length - 1];
  const active = pipeline.stages.find((stage) => stage.state === "active");
  const percent = Math.round(pipeline.progress * 100);

  useEffect(() => {
    const node = feedRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [pipeline.events.length]);

  return (
    <section aria-busy="true" className="mx-auto max-w-5xl">
      <p className="sr-only" aria-live="polite">
        {active ? STAGE_LABEL[active.id] : "Working"}. {percent} percent.
        {last ? ` ${last.message}` : ""}
      </p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Analysis v{pipeline.analysisVersion}</p>
          <h1 className="mt-2 font-serif text-4xl leading-none tracking-tight md:text-6xl">Reading the file</h1>
        </div>
        <p className="font-mono text-sm text-muted-foreground">{percent}%</p>
      </div>
      <div className="mt-6 h-px bg-border">
        <motion.div
          className="h-px bg-foreground"
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={reduce ? { duration: 0 } : { duration: 0.35 }}
        />
      </div>
      <div className="mt-8 grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
        <AnalysisTimeline stages={pipeline.stages} />
        <div>
          <p className="kicker">Extraction feed</p>
          <ol ref={feedRef} className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1" aria-relevant="additions">
            {pipeline.events.map((event) => {
              const document = documents.find((item) => item.id === event.documentId);
              return (
                <li key={event.id} className="font-mono text-[13px] leading-6 text-foreground/90">
                  <span className="mr-2 text-muted-foreground">{STAGE_LABEL[event.stage]}</span>
                  <span className={event.tone === "attention" ? "text-brass" : event.tone === "clear" ? "text-sage" : ""}>
                    {event.message}
                  </span>
                  {document ? <span className="sr-only"> from {document.filename}</span> : null}
                </li>
              );
            })}
          </ol>
          <ul className="mt-6 flex flex-wrap gap-2">
            {documents.map((document) => (
              <li key={document.id} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                {document.filename}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
