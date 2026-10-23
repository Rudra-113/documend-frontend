"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiMode } from "@/lib/api/client";
import { useCase } from "@/lib/hooks/use-case";
import { formatINR } from "@/lib/utils/format";
import { PHASE_LABEL } from "@/lib/utils/labels";
import { AnalysisTheater } from "@/components/analysis/AnalysisTheater";
import { AskView } from "@/components/chat/AskView";
import { IntelligenceView } from "@/components/dashboard/IntelligenceView";
import { DocumentsView } from "@/components/documents/DocumentsView";
import { EvidencePanel } from "@/components/evidence/EvidencePanel";
import { EvidenceView } from "@/components/evidence/EvidenceView";
import { FindingsView } from "@/components/findings/FindingsView";
import { InsuranceView } from "@/components/insurance/InsuranceView";
import { CaseView, SectionNav } from "@/components/layout/SectionNav";
import { Wordmark } from "@/components/layout/Wordmark";
import { AuditReport } from "@/components/reports/AuditReport";
import { UploadDropzone, type QueuedFile } from "@/components/upload/UploadDropzone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function CaseWorkspace({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = use(params);
  const workspace = useCase(caseId);
  const [view, setView] = useState<CaseView>("intelligence");
  const [addOpen, setAddOpen] = useState(false);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)");
    const apply = () => setWide(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const title = workspace.status?.case.title;
    if (title) document.title = `${title} · DocuMend Ledger`;
  }, [workspace.status?.case.title]);

  const activeFindingId = workspace.activeFindingId;
  const closeEvidence = workspace.closeEvidence;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && activeFindingId && !addOpen) closeEvidence();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addOpen, activeFindingId, closeEvidence]);

  if (workspace.loading && !workspace.status) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-16" aria-busy="true" aria-live="polite">
        <p className="kicker">Opening case</p>
        <div className="mt-6 h-10 w-72 rounded bg-muted" />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="h-36 rounded-xl bg-muted md:col-span-2" />
          <div className="h-36 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (workspace.error && !workspace.status) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20">
        <p className="kicker">Case</p>
        <h1 className="mt-3 font-serif text-4xl">This case is not on the ledger</h1>
        <p role="alert" className="mt-3 text-sm leading-6 text-muted-foreground">
          {workspace.error}
        </p>
        <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm text-primary-foreground">
          Back to intake
        </Link>
      </div>
    );
  }

  const status = workspace.status;
  if (!status) return null;
  const phase = status.pipeline.phase;
  const ready = phase === "ready" && workspace.results && workspace.insurance;
  const showAside = Boolean(ready && workspace.activeFindingId && view !== "evidence" && view !== "report" && wide);
  const mode = apiMode();

  async function submitAdded() {
    await workspace.addDocuments(
      queue.map((item) => item.file),
      queue.map((item) => item.type),
    );
    setQueue([]);
    setAddOpen(false);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="no-print sticky top-0 z-30 border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="shrink-0 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Ledger
            </Link>
            <Wordmark className="hidden shrink-0 md:inline-flex" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{status.case.title}</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                {status.case.id} · {PHASE_LABEL[phase]}
                {status.case.analysisVersion > 0 ? ` · v${status.case.analysisVersion}` : ""} · {mode === "mock" ? "Mock" : "Live"}
              </p>
            </div>
            {status.case.score != null && phase !== "processing" ? (
              <p className="shrink-0 font-serif text-3xl leading-none" aria-label={`Bill intelligence ${status.case.score}`}>
                {status.case.score}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} disabled={phase === "processing" || workspace.busy === "documents"}>
              Add documents
            </Button>
            <Button
              size="sm"
              onClick={() => void workspace.reanalyze()}
              disabled={phase === "processing" || status.documents.length === 0 || workspace.busy === "analyze"}
            >
              {workspace.busy === "analyze" || phase === "processing" ? "Re-analyzing…" : "Re-analyze"}
            </Button>
          </div>
        </div>
        {ready ? (
          <SectionNav
            value={view}
            onChange={setView}
            counts={{
              findings: workspace.findings.length,
              documents: status.documents.length,
            }}
          />
        ) : null}
      </header>

      <main id="content" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 md:px-6">
        {workspace.actionError ? (
          <div role="alert" className="no-print mb-4 flex items-start justify-between gap-3 rounded-xl border border-clay/40 bg-clay/10 px-4 py-3 text-sm">
            <p>{workspace.actionError}</p>
            <button type="button" onClick={workspace.dismissActionError} className="text-xs underline-offset-4 hover:underline">
              Dismiss
            </button>
          </div>
        ) : null}
        {status.stale && phase === "ready" ? (
          <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brass/40 bg-brass/10 px-4 py-3 text-sm">
            <p>Documents changed after audit v{status.case.analysisVersion}. Re-analyze to fold them in.</p>
            <Button size="sm" onClick={() => void workspace.reanalyze()} disabled={workspace.busy === "analyze"}>
              Re-analyze
            </Button>
          </div>
        ) : null}

        {phase === "processing" ? <AnalysisTheater pipeline={status.pipeline} documents={status.documents} /> : null}

        {phase === "draft" ? (
          <section className="mx-auto max-w-2xl">
            <p className="kicker">{status.case.id}</p>
            <h1 className="mt-2 font-serif text-4xl">The file is waiting</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {status.documents.length === 0
                ? "Add at least one document, then run the audit."
                : `${status.documents.length} document${status.documents.length === 1 ? "" : "s"} on file. Nothing has been read yet.`}
            </p>
            <div className="mt-6">
              <Button onClick={() => void workspace.reanalyze()} disabled={status.documents.length === 0 || workspace.busy === "analyze"}>
                Run analysis
              </Button>
            </div>
          </section>
        ) : null}

        {ready && workspace.results && workspace.insurance ? (
          <div className={showAside ? "xl:grid xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start xl:gap-5" : ""}>
            <div role="tabpanel" id={`panel-${view}`} aria-labelledby={`tab-${view}`}>
              {view === "intelligence" ? (
                <IntelligenceView results={workspace.results} findings={workspace.findings} onOpenFinding={workspace.openEvidence} />
              ) : null}
              {view === "findings" ? (
                <FindingsView
                  findings={workspace.findings}
                  documents={status.documents}
                  activeId={workspace.activeFindingId}
                  onOpen={workspace.openEvidence}
                />
              ) : null}
              {view === "insurance" ? (
                <InsuranceView insurance={workspace.insurance} onOpenFinding={workspace.openEvidence} />
              ) : null}
              {view === "evidence" ? (
                <EvidenceView
                  findings={workspace.findings}
                  activeId={workspace.activeFindingId}
                  bundle={workspace.evidence}
                  loading={workspace.evidenceLoading}
                  error={workspace.evidenceError}
                  onOpen={workspace.openEvidence}
                  onClose={workspace.closeEvidence}
                />
              ) : null}
              {view === "documents" ? (
                <DocumentsView
                  documents={status.documents}
                  analysisVersion={workspace.results.analysisVersion}
                  disabled={false}
                  busy={workspace.busy === "documents"}
                  onAdd={workspace.addDocuments}
                  onTypeChange={workspace.updateDocument}
                  onRemove={workspace.removeDocument}
                />
              ) : null}
              {view === "ask" ? (
                <AskView
                  messages={status.messages}
                  asking={workspace.busy === "ask"}
                  onAsk={workspace.ask}
                  onOpenFinding={(findingId) => {
                    workspace.openEvidence(findingId);
                    setView("evidence");
                  }}
                />
              ) : null}
              {view === "report" ? (
                <AuditReport
                  caseId={status.case.id}
                  title={status.case.title}
                  results={workspace.results}
                  findings={workspace.findings}
                  insurance={workspace.insurance}
                  documents={status.documents}
                />
              ) : null}
            </div>
            {showAside ? (
              <aside className="sticky top-28">
                <EvidencePanel
                  bundle={workspace.evidence}
                  loading={workspace.evidenceLoading}
                  error={workspace.evidenceError}
                  onClose={workspace.closeEvidence}
                />
              </aside>
            ) : null}
          </div>
        ) : null}

        {ready && status.case.billed != null ? (
          <p className="no-print mt-10 text-xs text-muted-foreground">
            Billed {formatINR(status.case.billed)}. DocuMend Ledger is a billing audit, not a coverage guarantee.
          </p>
        ) : null}
      </main>

      <Sheet
        open={Boolean(workspace.activeFindingId) && !wide && view !== "evidence"}
        onOpenChange={(open) => {
          if (!open) workspace.closeEvidence();
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md" side="right">
          <SheetHeader className="sr-only">
            <SheetTitle>Evidence</SheetTitle>
            <SheetDescription>Source pages for the selected finding.</SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <EvidencePanel
              bundle={workspace.evidence}
              loading={workspace.evidenceLoading}
              error={workspace.evidenceError}
              onClose={workspace.closeEvidence}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add documents</DialogTitle>
            <DialogDescription>
              New files stay outside the current audit until you re-analyze.
            </DialogDescription>
          </DialogHeader>
          <UploadDropzone files={queue} onChange={setQueue} disabled={workspace.busy === "documents"} compact />
          <Button
            disabled={queue.length === 0 || workspace.busy === "documents"}
            onClick={() => void submitAdded()}
          >
            {workspace.busy === "documents" ? "Adding…" : "Add to case"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
