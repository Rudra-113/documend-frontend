export const PIPELINE = [
  {
    id: "upload",
    index: "01",
    label: "Upload",
    title: "Every page lands on one desk.",
    body: "Bills, policies, discharge summaries, prescriptions, reports, and receipts enter as one case. Add more after the first reading.",
  },
  {
    id: "extract",
    index: "02",
    label: "Extract",
    title: "The file is named before it is trusted.",
    body: "Each document is classified. Pages become lines the later stages can argue with.",
  },
  {
    id: "understand",
    index: "03",
    label: "Understand",
    title: "A face sheet, then a charge ledger.",
    body: "Patient, stay, room, payer, and every rupee on the bill are written into one record.",
  },
  {
    id: "cross_check",
    index: "04",
    label: "Cross-check",
    title: "The bill has to agree with the ward.",
    body: "Discharge time, procedures, and quantities are held against the clinical pages.",
  },
  {
    id: "audit",
    index: "05",
    label: "Audit",
    title: "Integrity, consistency, completeness.",
    body: "Duplicates, odd counts, contradictions, and missing records become a bill intelligence score.",
  },
  {
    id: "insurance",
    index: "06",
    label: "Insurance",
    title: "The schedule answers, line by line.",
    body: "Room caps, proportionate cuts, co-pay, and non-payables explain what the insurer will not take.",
  },
  {
    id: "evidence",
    index: "07",
    label: "Evidence",
    title: "Every flag points at a page.",
    body: "A finding without a citation does not survive. The excerpt stays attached to the claim.",
  },
] as const;

export const SIGNALS = [
  {
    id: "duplicate",
    kicker: "Duplicate",
    title: "Same dose. Same minute. Posted again.",
    detail: "A repeated charge is separated from the line that can still be argued.",
  },
  {
    id: "quantity",
    kicker: "Quantity",
    title: "Forty-eight pairs for a four-port case.",
    detail: "Counts that sit far outside a usual procedure are marked before the claim goes out.",
  },
  {
    id: "contradiction",
    kicker: "Contradiction",
    title: "The bill and the summary do not share a morning.",
    detail: "A room day on the discharge date, a scan the report never describes, a drain the note denies.",
  },
  {
    id: "missing",
    kicker: "Missing record",
    title: "The operative note is not in the file.",
    detail: "Expected documents are named when they are absent, not quietly skipped.",
  },
  {
    id: "insurance",
    kicker: "Insurance",
    title: "The cap is applied per night.",
    detail: "Deluxe above the schedule becomes a patient share, with the clause beside the number.",
  },
  {
    id: "why",
    kicker: "Why unpaid",
    title: "Each refusal gets a sentence.",
    detail: "Co-pay, non-payables, duplicates, and open lines are explained in the language of the schedule.",
  },
  {
    id: "evidence",
    kicker: "Evidence",
    title: "The highlight is the argument.",
    detail: "Open a finding and the page it came from is already marked.",
  },
  {
    id: "ask",
    kicker: "Ask DocuMend",
    title: "Questions stay inside this audit.",
    detail: "Ask why a line is unpaid. The answer cites the file, not a general model.",
  },
] as const;

export const MARQUEE = [
  "Hospital bill",
  "Policy schedule",
  "Discharge summary",
  "Prescription",
  "Diagnostic report",
  "Pharmacy receipt",
  "Pre-authorization",
  "Operative notes",
];

export const SPECIMEN = {
  billed: 307795,
  insurer: 163390,
  patient: 127005,
  review: 17400,
  score: 60,
  findings: 13,
};
