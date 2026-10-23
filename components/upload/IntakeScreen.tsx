"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, apiMode } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { useCaseList } from "@/lib/hooks/use-case";
import { MERIDIAN_SAMPLE_NOTE, meridianSampleFiles } from "@/lib/sample/meridian";
import { formatINR, formatStamp } from "@/lib/utils/format";
import { PHASE_LABEL } from "@/lib/utils/labels";
import { AnalysisTimeline } from "@/components/analysis/AnalysisTimeline";
import { Wordmark } from "@/components/layout/Wordmark";
import { UploadDropzone, filesToQueue, type QueuedFile } from "@/components/upload/UploadDropzone";
import { Button } from "@/components/ui/button";
import { emptyStages } from "@/lib/mock/stages";
import Link from "next/link";

export function IntakeScreen() {
  const router = useRouter();
  const { cases, error: listError, loading, refresh } = useCaseList();
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mode = apiMode();

  async function openCase(files: QueuedFile[]) {
    setSubmitting(true);
    setError(null);
    let caseId = "";
    try {
      const created = await api.createCase();
      caseId = created.id;
      await api.addDocuments(
        caseId,
        files.map((item) => item.file),
        files.map((item) => item.type),
      );
      await api.analyze(caseId);
      router.push(`/cases/${caseId}`);
    } catch (err) {
      setError(errorMessage(err, "The case could not be opened."));
      setSubmitting(false);
      void refresh();
      if (caseId) router.push(`/cases/${caseId}`);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 md:px-6">
        <Wordmark />
        <p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
          {mode === "mock" ? "Mock ledger · API ready" : "Live API"}
        </p>
      </header>
      <main id="content" className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-4 pb-16 md:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <section>
          <p className="kicker">Case intake</p>
          <h1 className="mt-4 max-w-xl font-serif text-5xl leading-[0.95] tracking-tight md:text-7xl">
            Read the bill.
            <span className="mt-2 block italic text-foreground/90">Then make it defend itself.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
            DocuMend Ledger lines up a hospital bill with the policy, the discharge summary, the prescription, the reports, and the receipts. Duplicates, odd quantities, contradictions, missing records, and unpaid lines are pinned to the page they came from.
          </p>
          <div className="mt-8">
            <AnalysisTimeline stages={emptyStages("pending")} compact />
          </div>
        </section>
        <section className="panel p-5 md:p-6">
          <p className="kicker">Documents</p>
          <div className="mt-4">
            <UploadDropzone files={queue} onChange={setQueue} disabled={submitting} />
          </div>
          {error ? (
            <p role="alert" className="mt-3 text-sm text-clay">
              {error}
            </p>
          ) : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button className="h-11 flex-1" disabled={submitting || queue.length === 0} onClick={() => void openCase(queue)}>
              {submitting ? "Opening the case…" : "Begin analysis"}
            </Button>
            <Button
              variant="outline"
              className="h-11"
              disabled={submitting}
              onClick={() => void openCase(filesToQueue(meridianSampleFiles()))}
            >
              Meridian sample
            </Button>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{MERIDIAN_SAMPLE_NOTE}</p>
        </section>
        <section className="lg:col-span-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-2xl">Recent cases</h2>
            <p className="text-xs text-muted-foreground">Kept in this browser until a FastAPI server is connected.</p>
          </div>
          {loading ? <p className="mt-4 text-sm text-muted-foreground">Loading the ledger…</p> : null}
          {listError ? (
            <p role="alert" className="mt-4 text-sm text-clay">
              {listError}
            </p>
          ) : null}
          {!loading && cases && cases.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No cases yet. The first file you add becomes a case.</p>
          ) : null}
          {cases && cases.length > 0 ? (
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {cases.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/cases/${item.id}`}
                    className="grid gap-2 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:grid-cols-[minmax(0,1.4fr)_120px_120px_140px] sm:items-center"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{item.title}</span>
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
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </main>
    </div>
  );
}
