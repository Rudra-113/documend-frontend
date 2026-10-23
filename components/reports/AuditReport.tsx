"use client";

import type { CaseResults, DocumentRecord, Finding, InsuranceAssessment } from "@/lib/types/domain";
import { formatINR, formatStamp } from "@/lib/utils/format";
import { DOCUMENT_TYPE_LABEL, FINDING_TYPE_LABEL, SEVERITY_LABEL } from "@/lib/utils/labels";
import { auditMarkdown, downloadText } from "@/lib/utils/report";
import { Button } from "@/components/ui/button";

export function AuditReport({
  caseId,
  title,
  results,
  findings,
  insurance,
  documents,
}: {
  caseId: string;
  title: string;
  results: CaseResults;
  findings: Finding[];
  insurance: InsuranceAssessment;
  documents: DocumentRecord[];
}) {
  const face = results.patient;
  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">Audit report</p>
          <h2 className="mt-1 font-serif text-3xl">Prepared for the file</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              downloadText(
                `${caseId}-audit-v${results.analysisVersion}.md`,
                auditMarkdown({ caseId, title, results, findings, insurance, documents }),
              )
            }
          >
            Download
          </Button>
          <Button onClick={() => window.print()}>Print</Button>
        </div>
      </div>
      <article className="report-sheet mx-auto max-w-3xl rounded-sm px-6 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)] md:px-12 md:py-12">
        <header className="border-b border-black/10 pb-6">
          <p className="font-serif text-3xl">DocuMend Ledger</p>
          <p className="mt-2 font-mono text-[11px] tracking-[0.16em] uppercase">
            {caseId} · Audit v{results.analysisVersion}
          </p>
          <p className="mt-1 text-sm">{title}</p>
          <p className="mt-1 text-xs opacity-70">Generated {formatStamp(results.generatedAt)} IST</p>
        </header>
        <section className="mt-6">
          <p className="text-xs tracking-[0.16em] uppercase opacity-60">Opinion</p>
          <p className="mt-2 font-serif text-4xl">
            {results.score ?? "—"}
            <span className="ml-3 text-lg">{results.scoreLabel}</span>
          </p>
          <p className="mt-3 text-sm leading-6">{results.narrative}</p>
        </section>
        <section className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
          <p>
            <span className="block text-xs uppercase opacity-60">Patient</span>
            {face.name ?? "Not established"}
          </p>
          <p>
            <span className="block text-xs uppercase opacity-60">Facility</span>
            {face.facility ?? "—"}
          </p>
          <p>
            <span className="block text-xs uppercase opacity-60">Procedure</span>
            {face.procedure ?? "—"}
          </p>
          <p>
            <span className="block text-xs uppercase opacity-60">Payer</span>
            {face.payer ?? "—"} {face.policyNumber ?? ""}
          </p>
        </section>
        <section className="mt-8 grid grid-cols-2 gap-4 border-y border-black/10 py-4 text-sm sm:grid-cols-4">
          <p>
            <span className="block text-xs uppercase opacity-60">Billed</span>
            {formatINR(results.totals.billed)}
          </p>
          <p>
            <span className="block text-xs uppercase opacity-60">Insurer</span>
            {formatINR(results.totals.insurerApproved)}
          </p>
          <p>
            <span className="block text-xs uppercase opacity-60">Patient</span>
            {formatINR(results.totals.patientShare)}
          </p>
          <p>
            <span className="block text-xs uppercase opacity-60">Open</span>
            {formatINR(results.totals.underReview)}
          </p>
        </section>
        <section className="mt-8">
          <h3 className="text-xs tracking-[0.16em] uppercase opacity-60">Findings</h3>
          <ol className="mt-3 space-y-4">
            {findings.map((finding, index) => (
              <li key={finding.id}>
                <p className="text-sm font-medium">
                  {index + 1}. {finding.title}
                </p>
                <p className="mt-1 text-xs opacity-70">
                  {SEVERITY_LABEL[finding.severity]} · {FINDING_TYPE_LABEL[finding.type]}
                  {finding.impactAmount != null ? ` · ${formatINR(finding.impactAmount)}` : ""}
                </p>
                <p className="mt-1 text-sm leading-6">{finding.summary}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="mt-8">
          <h3 className="text-xs tracking-[0.16em] uppercase opacity-60">Why the balance is unpaid</h3>
          <div className="mt-3 space-y-4">
            {insurance.denials.map((denial) => (
              <div key={denial.id}>
                <p className="text-sm font-medium">
                  {denial.title} · {formatINR(denial.amount)}
                </p>
                <p className="mt-1 text-sm leading-6">{denial.explanation}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="mt-8">
          <h3 className="text-xs tracking-[0.16em] uppercase opacity-60">Documents</h3>
          <ul className="mt-2 text-sm leading-6">
            {documents.map((document) => (
              <li key={document.id}>
                {document.filename} — {DOCUMENT_TYPE_LABEL[document.type]}
              </li>
            ))}
          </ul>
        </section>
        <section className="mt-8">
          <h3 className="text-xs tracking-[0.16em] uppercase opacity-60">Limitations</h3>
          <ul className="mt-2 list-disc pl-4 text-sm leading-6">
            {results.limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <footer className="mt-10 border-t border-black/10 pt-4 text-xs leading-5 opacity-70">
          DocuMend Ledger prepares a billing audit. It is not a clinical opinion and it is not a coverage guarantee.
        </footer>
      </article>
    </div>
  );
}
