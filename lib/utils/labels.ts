import type {
  CasePhase,
  CoverageStatus,
  DocumentType,
  FindingType,
  Severity,
  StageId,
} from "@/lib/types/domain";

export const DOCUMENT_TYPES: DocumentType[] = [
  "hospital_bill",
  "insurance_policy",
  "discharge_summary",
  "prescription",
  "diagnostic_report",
  "receipt",
  "pre_authorization",
  "operative_notes",
  "claim_letter",
  "other",
];

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  hospital_bill: "Hospital bill",
  insurance_policy: "Insurance policy",
  discharge_summary: "Discharge summary",
  prescription: "Prescription",
  diagnostic_report: "Diagnostic report",
  receipt: "Receipt",
  pre_authorization: "Pre-authorization",
  operative_notes: "Operative notes",
  claim_letter: "Claim letter",
  other: "Unclassified",
};

export const FINDING_TYPE_LABEL: Record<FindingType, string> = {
  duplicate: "Duplicate",
  quantity_anomaly: "Quantity",
  contradiction: "Contradiction",
  missing_document: "Missing document",
  non_payable: "Non-payable",
  coverage_gap: "Coverage",
  other: "Other",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Note",
};

export const COVERAGE_STATUS_LABEL: Record<CoverageStatus, string> = {
  payable: "Payable",
  partial: "Partial",
  denied: "Not payable",
  review: "Under review",
  missing_policy: "Needs policy",
};

export const PHASE_LABEL: Record<CasePhase, string> = {
  draft: "Draft",
  processing: "Reading",
  ready: "Audited",
  failed: "Failed",
};

export const STAGE_LABEL: Record<StageId, string> = {
  upload: "Upload",
  extract: "Extract",
  understand: "Understand",
  cross_check: "Cross-check",
  audit: "Audit",
  insurance: "Insurance",
  evidence: "Evidence",
};

export function inferDocumentType(filename: string): {
  type: DocumentType;
  confidence: number;
} {
  const name = filename.toLowerCase();
  const rules: Array<[RegExp, DocumentType, number]> = [
    [/pre[-_\s]?auth|authori[sz]ation|approval/, "pre_authorization", 0.9],
    [/operative|op[-_\s]?note|operation|ot[-_\s]?note/, "operative_notes", 0.9],
    [/prescri|\brx\b/, "prescription", 0.9],
    [/discharge/, "discharge_summary", 0.92],
    [/policy|insurer|wording|schedule/, "insurance_policy", 0.86],
    [/receipt|pharmacy/, "receipt", 0.84],
    [/lab|diagnostic|pathology|radiology|\busg\b|\bmri\b|\bct\b|report/, "diagnostic_report", 0.8],
    [/claim/, "claim_letter", 0.84],
    [/bill|invoice|charge|ledger|estimate/, "hospital_bill", 0.88],
  ];
  for (const [pattern, type, confidence] of rules) {
    if (pattern.test(name)) return { type, confidence };
  }
  return { type: "other", confidence: 0.34 };
}
