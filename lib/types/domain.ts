export type DocumentType =
  | "hospital_bill"
  | "insurance_policy"
  | "discharge_summary"
  | "prescription"
  | "diagnostic_report"
  | "receipt"
  | "pre_authorization"
  | "operative_notes"
  | "claim_letter"
  | "other";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type FindingType =
  | "duplicate"
  | "quantity_anomaly"
  | "contradiction"
  | "missing_document"
  | "non_payable"
  | "coverage_gap"
  | "other";

export type StageId =
  | "upload"
  | "extract"
  | "understand"
  | "cross_check"
  | "audit"
  | "insurance"
  | "evidence";

export type StageState = "pending" | "active" | "complete";

export type CasePhase = "draft" | "processing" | "ready" | "failed";

export type CoverageStatus =
  | "payable"
  | "partial"
  | "denied"
  | "review"
  | "missing_policy";

export interface DocumentRecord {
  id: string;
  caseId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number | null;
  pageCount: number | null;
  type: DocumentType;
  typeSource: "inferred" | "user" | "server";
  typeLabel?: string | null;
  classificationConfidence: number | null;
  processingState?: string | null;
  extraction?: DocumentExtraction | null;
  addedAt: string;
  analysisVersion: number | null;
}

export interface ExtractedItem {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  amount: number | null;
}

export interface DocumentExtraction {
  total: number | null;
  dates: string[];
  items: ExtractedItem[];
  diagnosis: string | null;
  procedures: string[];
  patientName: string | null;
  facility: string | null;
  uhid: string | null;
  payer: string | null;
  policyNumber: string | null;
}

export interface PipelineStage {
  id: StageId;
  label: string;
  description: string;
  state: StageState;
}

export interface PipelineEvent {
  id: string;
  stage: StageId;
  message: string;
  documentId?: string;
  tone: "neutral" | "attention" | "clear";
}

export interface PipelineState {
  phase: CasePhase;
  stages: PipelineStage[];
  events: PipelineEvent[];
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  analysisVersion: number;
  error: string | null;
}

export interface LineItem {
  id: string;
  code: string;
  description: string;
  category: string;
  serviceDate: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  sourceDocumentId: string;
  page: number;
  findingIds: string[];
}

export interface PatientFace {
  name: string | null;
  age: number | null;
  sex: string | null;
  uhid: string | null;
  facility: string | null;
  facilityCity: string | null;
  admissionAt: string | null;
  dischargeAt: string | null;
  lengthOfStayNights: number | null;
  diagnosis: string | null;
  procedure: string | null;
  physician: string | null;
  payer: string | null;
  policyNumber: string | null;
  productName: string | null;
  tpa: string | null;
  roomCategory: string | null;
}

export interface ScoreBreakdown {
  key:
    | "completeness"
    | "consistency"
    | "billing_integrity"
    | "insurance_alignment"
    | "evidence_strength";
  label: string;
  score: number;
  note: string;
}

export interface BillTotals {
  billed: number;
  admissible: number;
  nonPayable: number;
  underReview: number;
  patientShare: number;
  insurerApproved: number;
  coPay: number;
  currency: "INR";
}

export interface LiveLedgerFigures {
  status: string;
  billTotal: number | null;
  copayPercent: number | null;
  insuranceShare: number | null;
  patientShare: number | null;
  disclaimer: string | null;
  message: string | null;
  documentCount: number;
}

export interface CaseResults {
  caseId: string;
  analysisVersion: number;
  generatedAt: string;
  patient: PatientFace;
  totals: BillTotals;
  score: number | null;
  scoreLabel: string;
  ledger?: LiveLedgerFigures | null;
  narrative: string;
  breakdown: ScoreBreakdown[];
  lineItems: LineItem[];
  documentIds: string[];
  limitations: string[];
}

export interface Finding {
  id: string;
  caseId: string;
  type: FindingType;
  severity: Severity;
  title: string;
  summary: string;
  impactAmount: number | null;
  confidence: number | null;
  typeLabel?: string;
  evidenceNotes?: Array<{ document: string; page: number; reason: string | null }>;
  documentIds: string[];
  lineItemIds: string[];
  recommendation: string;
}

export interface EvidenceExcerpt {
  id: string;
  documentId: string;
  documentName: string;
  documentType: DocumentType;
  page: number;
  section: string;
  text: string;
  highlight: string;
  confidence: number;
}

export interface EvidenceBundle {
  findingId: string;
  headline: string;
  explanation: string;
  excerpts: EvidenceExcerpt[];
  relation: "supports" | "conflicts" | "absent";
}

export interface CoverageRowModel {
  id: string;
  lineItemId: string;
  label: string;
  category: string;
  billed: number;
  allowed: number;
  denied: number;
  review: number;
  status: CoverageStatus;
  rule: string;
  reason: string;
  clause: string | null;
}

export interface DenialExplanation {
  id: string;
  title: string;
  amount: number;
  explanation: string;
  clause: string | null;
  documentIds: string[];
  confidence: number;
  findingId: string | null;
}

export interface InsuranceAssessment {
  caseId: string;
  analysisVersion: number;
  policyOnFile: boolean;
  payer: string | null;
  productName: string | null;
  policyNumber: string | null;
  sumInsured: number | null;
  roomRentCapPerDay: number | null;
  coPayRate: number | null;
  proportionateDeduction: boolean;
  narrative: string;
  rows: CoverageRowModel[];
  denials: DenialExplanation[];
  payableTotal: number;
  deniedTotal: number;
  reviewTotal: number;
  ledger?: LiveLedgerFigures | null;
}

export interface Citation {
  documentId: string;
  documentName: string;
  page: number;
  excerpt: string;
  findingId?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  citations?: Citation[];
  confidence?: number;
}

export interface CaseSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  phase: CasePhase;
  documentCount: number;
  patientName: string | null;
  facility: string | null;
  score: number | null;
  scoreLabel: string | null;
  billed: number | null;
  analysisVersion: number;
  stale: boolean;
}

export interface StatusResponse {
  case: CaseSummary;
  documents: DocumentRecord[];
  pipeline: PipelineState;
  messages: ChatMessage[];
  stale: boolean;
}

export interface AskResponse {
  message: ChatMessage;
  messages: ChatMessage[];
}

export interface CreateCaseInput {
  title?: string;
}
