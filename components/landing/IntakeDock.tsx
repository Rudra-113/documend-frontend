"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import type { CaseSummary } from "@/lib/types/domain";
import { MERIDIAN_SAMPLE_NOTE } from "@/lib/sample/meridian";
import { formatINR, formatStamp } from "@/lib/utils/format";
import { PHASE_LABEL } from "@/lib/utils/labels";
import { UploadDropzone, type QueuedFile } from "@/components/upload/UploadDropzone";
import { Button } from "@/components/ui/button";

export function IntakeDock({
  queue,
  onChange,
  submitting,
  error,
  onBegin,
  onSample,
}: {
  queue: QueuedFile[];
  onChange: (files: QueuedFile[]) => void;
  submitting: boolean;
  error: string | null;
  onBegin: () => void;
  onSample: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <section id="open" className="scroll-mt-24 px-4 py-20 md:px-6">
      <motion.div
        className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
        initial={false}
        whileInView={reduce ? undefined : { y: [12, 0] }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <div>
          <p className="kicker">Open a case</p>
          <h2 className="mt-3 font-serif text-4xl leading-[1.02] md:text-6xl">Drop the file on the desk.</h2>
          <p className="mt-5 text-sm leading-7 text-muted-foreground">
            Several documents at once. Set each type if the name does not give it away. The Meridian sample is ready if you want the disagreement already in the pages.
          </p>
        </div>
        <div className="panel p-5 md:p-6">
          <UploadDropzone files={queue} onChange={onChange} disabled={submitting} />
          {error ? (
            <p role="alert" className="mt-3 text-sm text-clay">
              {error}
            </p>
          ) : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button className="h-11 flex-1" disabled={submitting || queue.length === 0} onClick={onBegin}>
              {submitting ? "Opening the case…" : "Begin analysis"}
            </Button>
            <Button variant="outline" className="h-11" disabled={submitting} onClick={onSample}>
              Meridian sample
            </Button>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{MERIDIAN_SAMPLE_NOTE}</p>
        </div>
      </motion.div>
    </section>
  );
}

export function CaseIndex({
  cases,
  loading,
  error,
}: {
  cases: CaseSummary[] | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <section id="cases" className="scroll-mt-24 px-4 pt-4 pb-24 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-serif text-3xl">Recent cases</h2>
          <p className="text-xs text-muted-foreground">Kept in this browser until a FastAPI server is connected.</p>
        </div>
        {loading ? <p className="mt-6 text-sm text-muted-foreground">Loading the ledger…</p> : null}
        {error ? (
          <p role="alert" className="mt-6 text-sm text-clay">
            {error}
          </p>
        ) : null}
        {!loading && cases && cases.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">No cases yet. The first file you add becomes a case.</p>
        ) : null}
        {cases && cases.length > 0 ? (
          <ul className="mt-6 divide-y divide-border border-y border-border">
            {cases.map((item, index) => (
              <motion.li
                key={item.id}
                initial={false}
                whileInView={{ y: [8, 0] }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.04 }}
              >
                <Link
                  href={`/cases/${item.id}`}
                  className="group grid gap-2 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:grid-cols-[minmax(0,1.4fr)_80px_140px_180px] sm:items-center"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm transition-transform duration-300 group-hover:translate-x-1">{item.title}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {item.id} · {item.documentCount} document{item.documentCount === 1 ? "" : "s"}
                      {item.stale ? " · stale" : ""}
                    </span>
                  </span>
                  <span className="font-mono text-sm">{item.score ?? "—"}</span>
                  <span className="text-sm text-muted-foreground">{item.billed != null ? formatINR(item.billed) : "—"}</span>
                  <span className="text-xs text-muted-foreground">
                    {PHASE_LABEL[item.phase]} · {formatStamp(item.updatedAt)}
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
