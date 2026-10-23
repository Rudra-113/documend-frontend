import { analyzeCase } from "../lib/mock/analyze";
import type { DocumentRecord, DocumentType } from "../lib/types/domain";

function doc(id: string, type: DocumentType, name: string): DocumentRecord {
  return {
    id,
    caseId: "DM-TEST",
    filename: name,
    mimeType: "application/pdf",
    sizeBytes: 180_000,
    pageCount: 3,
    type,
    typeSource: "user",
    classificationConfidence: 1,
    addedAt: "2026-10-23T10:00:00+05:30",
    analysisVersion: null,
  };
}

const full = [
  doc("bill", "hospital_bill", "Meridian-City-Hospital-final-bill.pdf"),
  doc("policy", "insurance_policy", "Northstar-Health-Assure-policy-schedule.pdf"),
  doc("discharge", "discharge_summary", "Discharge-summary-Krishnan.pdf"),
  doc("rx", "prescription", "Discharge-prescription.pdf"),
  doc("lab", "diagnostic_report", "USG-and-LFT-report.pdf"),
  doc("receipt", "receipt", "Pharmacy-receipt-16-Oct.pdf"),
  doc("auth", "pre_authorization", "Pre-auth-approval-NH88421.pdf"),
];

const output = analyzeCase("DM-TEST", 1, full);
const totals = output.results.totals;
const identity = totals.insurerApproved + totals.patientShare + totals.underReview;
if (identity !== totals.billed) {
  throw new Error(`Money identity failed: ${identity} != ${totals.billed}`);
}
if (!output.findings.some((finding) => finding.id.endsWith("dup-pantoprazole"))) {
  throw new Error("Expected a duplicate finding");
}
if (!output.findings.some((finding) => finding.id.endsWith("missing-operative_notes"))) {
  throw new Error("Expected missing operative notes");
}
if (output.insurance.rows.length !== output.results.lineItems.length) {
  throw new Error("Coverage rows do not match the ledger");
}

const withNotes = analyzeCase("DM-TEST", 2, [
  ...full,
  doc("ot", "operative_notes", "operative-notes.pdf"),
]);
if (withNotes.findings.some((finding) => finding.id.endsWith("missing-operative_notes"))) {
  throw new Error("Operative notes should clear the missing-document finding");
}
const glove = withNotes.findings.find((finding) => finding.id.endsWith("qty-gloves"));
const gloveBefore = output.findings.find((finding) => finding.id.endsWith("qty-gloves"));
if (!glove || !gloveBefore || (glove.confidence ?? 0) <= (gloveBefore.confidence ?? 0)) {
  throw new Error("Operative notes should raise glove confidence");
}

const noBill = analyzeCase("DM-TEST", 1, [doc("policy", "insurance_policy", "policy.pdf")]);
if (noBill.results.lineItems.length !== 0) {
  throw new Error("A policy alone should not invent a ledger");
}

const noPolicy = analyzeCase("DM-TEST", 1, [doc("bill", "hospital_bill", "final-bill.pdf")]);
if (noPolicy.insurance.policyOnFile || noPolicy.results.totals.coPay !== 0) {
  throw new Error("Co-pay must wait for the schedule");
}
if (noPolicy.insurance.rows.some((row) => row.status === "partial")) {
  throw new Error("Proportionate deduction must not run without a policy");
}

console.log(
  JSON.stringify(
    {
      billed: totals.billed,
      insurer: totals.insurerApproved,
      patient: totals.patientShare,
      review: totals.underReview,
      score: output.results.score,
      findings: output.findings.map((finding) => finding.id),
      events: output.events.length,
    },
    null,
    2,
  ),
);
