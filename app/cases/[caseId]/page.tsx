import { Suspense } from "react";
import { CaseWorkspace } from "@/components/layout/CaseWorkspace";

function Opening() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16" aria-busy="true">
      <p className="kicker">Opening case</p>
      <div className="mt-6 h-10 w-72 rounded bg-muted" />
    </div>
  );
}

export default function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  return (
    <Suspense fallback={<Opening />}>
      <CaseWorkspace params={params} />
    </Suspense>
  );
}
