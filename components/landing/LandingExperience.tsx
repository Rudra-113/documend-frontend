"use client";

import type { CaseSummary } from "@/lib/types/domain";
import { ExhibitBand } from "@/components/landing/ExhibitBand";
import { HeroStage, DocumentMarquee } from "@/components/landing/HeroStage";
import { CaseIndex, IntakeDock } from "@/components/landing/IntakeDock";
import { LandingNav, ScrollProgress } from "@/components/landing/LandingNav";
import { PinnedMethod } from "@/components/landing/PinnedMethod";
import { SignalRail } from "@/components/landing/SignalRail";
import type { QueuedFile } from "@/components/upload/UploadDropzone";

export function LandingExperience({
  mode,
  queue,
  onChange,
  submitting,
  error,
  onBegin,
  onSample,
  cases,
  listLoading,
  listError,
}: {
  mode: "mock" | "live";
  queue: QueuedFile[];
  onChange: (files: QueuedFile[]) => void;
  submitting: boolean;
  error: string | null;
  onBegin: () => void;
  onSample: () => void;
  cases: CaseSummary[] | null;
  listLoading: boolean;
  listError: string | null;
}) {
  return (
    <div className="relative flex flex-1 flex-col">
      <ScrollProgress />
      <LandingNav mode={mode} />
      <main id="content">
        <HeroStage />
        <DocumentMarquee />
        <PinnedMethod />
        <SignalRail />
        <ExhibitBand onSample={onSample} submitting={submitting} />
        <IntakeDock queue={queue} onChange={onChange} submitting={submitting} error={error} onBegin={onBegin} onSample={onSample} />
        <CaseIndex cases={cases} loading={listLoading} error={listError} />
      </main>
      <footer className="border-t border-border px-4 py-8 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="font-serif text-lg">DocuMend Ledger</p>
          <p className="max-w-sm text-xs leading-5 text-muted-foreground">A billing audit, not a coverage guarantee. Figures on the exhibit are the Meridian specimen.</p>
        </div>
      </footer>
    </div>
  );
}
