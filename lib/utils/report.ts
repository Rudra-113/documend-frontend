import type { CaseResults, DocumentRecord, Finding, InsuranceAssessment } from "@/lib/types/domain";
import { formatINR, formatStamp } from "@/lib/utils/format";
import { DOCUMENT_TYPE_LABEL, FINDING_TYPE_LABEL, SEVERITY_LABEL } from "@/lib/utils/labels";

export function auditMarkdown(input: {
  caseId: string;
  title: string;
  results: CaseResults;
  findings: Finding[];
  insurance: InsuranceAssessment;
  documents: DocumentRecord[];
}) {
  const { results, findings, insurance } = input;
  const face = results.patient;
  const lines = [
    `# DocuMend Ledger`,
    ``,
    `Audit report · ${input.caseId} · version ${results.analysisVersion}`,
    `Generated ${formatStamp(results.generatedAt)} IST`,
    ``,
    `## Opinion`,
    ``,
    `**${results.score ?? "—"} — ${results.scoreLabel}**`,
    ``,
    results.narrative,
    ``,
    `## Face sheet`,
    ``,
    `- Patient: ${face.name ?? "Not established"}`,
    `- Facility: ${face.facility ?? "—"}${face.facilityCity ? `, ${face.facilityCity}` : ""}`,
    `- Admission: ${face.admissionAt ? formatStamp(face.admissionAt) : "—"}`,
    `- Discharge: ${face.dischargeAt ? formatStamp(face.dischargeAt) : "—"}`,
    `- Diagnosis: ${face.diagnosis ?? "—"}`,
    `- Procedure: ${face.procedure ?? "—"}`,
    `- Payer: ${face.payer ?? "—"}${face.policyNumber ? ` · ${face.policyNumber}` : ""}`,
    ``,
    `## Money`,
    ``,
    ...(results.ledger
      ? [
          `- Status: ${results.ledger.status}`,
          `- Bill total: ${results.ledger.billTotal == null ? "—" : formatINR(results.ledger.billTotal)}`,
          `- Copay: ${results.ledger.copayPercent == null ? "—" : `${results.ledger.copayPercent > 1 ? Math.round(results.ledger.copayPercent) : Math.round(results.ledger.copayPercent * 100)}%`}`,
          `- Estimated insurance share: ${results.ledger.insuranceShare == null ? "—" : formatINR(results.ledger.insuranceShare)}`,
          `- Estimated patient share: ${results.ledger.patientShare == null ? "—" : formatINR(results.ledger.patientShare)}`,
          results.ledger.disclaimer ? `- Disclaimer: ${results.ledger.disclaimer}` : "",
        ]
      : [
          `- Billed: ${formatINR(results.totals.billed)}`,
          `- Insurer position: ${formatINR(results.totals.insurerApproved)}`,
          `- Patient share: ${formatINR(results.totals.patientShare)}`,
          `- Under review: ${formatINR(results.totals.underReview)}`,
          `- Co-pay: ${formatINR(results.totals.coPay)}`,
        ]),
    ``,
    `## Findings`,
    ``,
    ...findings.flatMap((finding) => [
      `### ${finding.title}`,
      ``,
      `${SEVERITY_LABEL[finding.severity]} · ${finding.typeLabel ?? FINDING_TYPE_LABEL[finding.type]}${finding.confidence == null ? "" : ` · confidence ${Math.round(finding.confidence * 100)}%`}`,
      ``,
      finding.summary,
      ``,
      finding.impactAmount != null ? `Exposure: ${formatINR(finding.impactAmount)}` : "",
      ``,
      finding.recommendation,
      ``,
    ]),
    `## Why insurance is not paying the balance`,
    ``,
    insurance.narrative,
    ``,
    ...insurance.denials.flatMap((denial) => [
      `### ${denial.title}`,
      ``,
      `${formatINR(denial.amount)}${denial.clause ? ` · ${denial.clause}` : ""}`,
      ``,
      denial.explanation,
      ``,
    ]),
    `## Documents`,
    ``,
    ...input.documents.map(
      (document) =>
        `- ${document.filename} — ${DOCUMENT_TYPE_LABEL[document.type]}${document.analysisVersion == null ? " (not in this audit)" : ""}`,
    ),
    ``,
    `## Limitations`,
    ``,
    ...results.limitations.map((item) => `- ${item}`),
    ``,
    `DocuMend Ledger prepares a billing audit. It is not a clinical opinion and it is not a coverage guarantee.`,
    ``,
  ];
  return lines.filter((line) => line !== undefined).join("\n");
}

export function downloadText(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
