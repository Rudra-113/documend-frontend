import { ApiError } from "@/lib/api/errors";
import {
  analyzeCase,
  askDocuMend,
  createCase as createCaseRequest,
  getCase,
  getFindings as getFindingsRequest,
  getInsurance as getInsuranceRequest,
  uploadDocument,
} from "@/lib/api/fastapi";
import type { LedgerApi } from "@/lib/mock/api";
import type {
  AskResponse,
  CaseResults,
  CaseSummary,
  ChatMessage,
  DocumentRecord,
  DocumentType,
  EvidenceBundle,
  Finding,
  FindingType,
  InsuranceAssessment,
  LiveLedgerFigures,
  PatientFace,
  PipelineEvent,
  PipelineStage,
  Severity,
  StageId,
  StatusResponse,
} from "@/lib/types/domain";

const IDS_KEY = "documend.live.caseIds";
const ACTIVE_KEY = "documend.activeCaseId";
const META_KEY = "documend.live.meta";
const STAGE_HOLD_MS = 700;

const LIVE_STAGES: Array<{ id: StageId; label: string; description: string }> = [
  { id: "upload", label: "Uploading", description: "The files are already on this case." },
  { id: "extract", label: "Extracting", description: "Reading pages from each PDF." },
  { id: "understand", label: "Understanding", description: "Identifying what each document is." },
  { id: "cross_check", label: "Cross-checking", description: "Comparing the documents with each other." },
  { id: "insurance", label: "Insurance analysis", description: "Reading the bill against the policy." },
  { id: "evidence", label: "Evidence linking", description: "Attaching each finding to a page." },
  { id: "audit", label: "Complete", description: "Waiting for the ledger to finish." },
];

interface StoredMeta {
  version: number;
  fingerprint: string;
  updatedAt: string;
}

interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  documents: DocumentRecord[];
  findings: Finding[];
  insurance: InsuranceAssessment | null;
  results: CaseResults | null;
  messages: ChatMessage[];
  analysisStatus: string | null;
  documentCount: number;
  phase: StatusResponse["pipeline"]["phase"];
  error: string | null;
  version: number;
  stale: boolean;
  jobStartedAt: number | null;
  job: Promise<void> | null;
}

const sessions = new Map<string, Session>();
const evidenceByFinding = new Map<string, EvidenceBundle>();
const findingIdsByCase = new Map<string, string[]>();

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function textOf(record: Record<string, unknown> | null, keys: string[]) {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function numberOf(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function humanize(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function storageGet(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // The case still lives for this tab.
  }
}

function readIds() {
  try {
    const parsed = JSON.parse(storageGet(IDS_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
  } catch {
    return [];
  }
}

function rememberId(caseId: string) {
  const ids = [caseId, ...readIds().filter((item) => item !== caseId)].slice(0, 24);
  storageSet(IDS_KEY, JSON.stringify(ids));
  storageSet(ACTIVE_KEY, caseId);
}

function forgetId(caseId: string) {
  storageSet(IDS_KEY, JSON.stringify(readIds().filter((item) => item !== caseId)));
}

function readMeta(): Record<string, StoredMeta> {
  try {
    const parsed = JSON.parse(storageGet(META_KEY) ?? "{}") as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, StoredMeta>) : {};
  } catch {
    return {};
  }
}

function writeMeta(caseId: string, meta: StoredMeta) {
  const all = readMeta();
  all[caseId] = meta;
  storageSet(META_KEY, JSON.stringify(all));
}

function readMessages(caseId: string): ChatMessage[] {
  try {
    const parsed = JSON.parse(storageGet(`documend.live.messages.${caseId}`) ?? "[]") as unknown;
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function writeMessages(caseId: string, messages: ChatMessage[]) {
  storageSet(`documend.live.messages.${caseId}`, JSON.stringify(messages));
}

function caseIdFrom(payload: unknown) {
  const record = asRecord(payload);
  const id = textOf(record, ["case_id", "id", "caseId"]);
  if (!id) throw new ApiError("The ledger did not return a case id.", 502, "bad_response");
  return id;
}

function mapDocumentType(raw: string | null): { type: DocumentType; typeLabel: string | null } {
  const normalized = (raw ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  const table: Record<string, DocumentType> = {
    hospital_bill: "hospital_bill",
    bill: "hospital_bill",
    invoice: "hospital_bill",
    insurance_policy: "insurance_policy",
    policy: "insurance_policy",
    insurance: "insurance_policy",
    discharge_summary: "discharge_summary",
    discharge: "discharge_summary",
    prescription: "prescription",
    diagnostic_report: "diagnostic_report",
    diagnostic: "diagnostic_report",
    receipt: "receipt",
    claim_letter: "claim_letter",
    claim: "claim_letter",
    pre_authorization: "pre_authorization",
    operative_notes: "operative_notes",
  };
  const type = table[normalized];
  if (type) return { type, typeLabel: null };
  return { type: "other", typeLabel: raw ? humanize(raw) : null };
}

function mapSeverity(raw: string | null): Severity {
  const value = (raw ?? "").toLowerCase();
  if (value === "critical" || value === "high" || value === "medium" || value === "low" || value === "info") return value;
  if (value === "warning" || value === "moderate") return "medium";
  return "info";
}

function mapFindingType(raw: string | null): { type: FindingType; typeLabel?: string } {
  const value = (raw ?? "").toLowerCase();
  if (value.includes("duplicate")) return { type: "duplicate" };
  if (value.includes("quantity")) return { type: "quantity_anomaly" };
  if (value.includes("contradict")) return { type: "contradiction" };
  if (value.includes("missing")) return { type: "missing_document" };
  if (value.includes("non_payable") || value.includes("not_covered") || value.includes("nonpayable") || value.includes("exclusion")) {
    return { type: "non_payable" };
  }
  if (value.includes("coverage")) return { type: "coverage_gap" };
  return { type: "other", typeLabel: raw ? humanize(raw) : "Other" };
}

function listFrom(payload: unknown, keys: string[]) {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

function fingerprintOf(documents: DocumentRecord[]) {
  return documents
    .map((document) => `${document.id}:${document.filename}`)
    .sort()
    .join("|");
}

function toDocument(value: unknown, caseId: string, index: number, fallback?: File): DocumentRecord {
  const record = asRecord(value);
  const extracted = asRecord(record?.extracted_data);
  const filename =
    textOf(record, ["filename", "file_name", "name", "original_filename"]) ?? fallback?.name ?? `document-${index + 1}.pdf`;
  const rawType = textOf(extracted, ["document_type", "type"]) ?? textOf(record, ["document_type"]);
  const mapped = mapDocumentType(rawType);
  const pageCount = numberOf(record?.page_count ?? record?.pages ?? extracted?.page_count ?? extracted?.pages);
  const sizeBytes = numberOf(record?.size_bytes ?? record?.size) ?? (fallback ? fallback.size : null);
  return {
    id: textOf(record, ["id", "document_id"]) ?? `${caseId}:${filename}:${index}`,
    caseId,
    filename,
    mimeType: textOf(record, ["mime_type", "content_type"]) ?? fallback?.type ?? "application/pdf",
    sizeBytes,
    pageCount,
    type: mapped.type,
    typeSource: "server",
    typeLabel: mapped.typeLabel,
    classificationConfidence: null,
    processingState: textOf(record, ["processing_state", "processingState", "state", "status"]),
    addedAt: textOf(record, ["created_at", "added_at", "uploaded_at"]) ?? new Date().toISOString(),
    analysisVersion: null,
  };
}

function documentsFrom(payload: unknown, caseId: string, fallback?: File) {
  const record = asRecord(payload);
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(record?.documents)
      ? (record.documents as unknown[])
      : record && (record.filename || record.file_name || record.name || record.extracted_data)
        ? [record]
        : [];
  if (list.length === 0 && fallback) return [toDocument(null, caseId, 0, fallback)];
  return list.map((item, index) => toDocument(item, caseId, index, list.length === 1 ? fallback : undefined));
}

function evidenceItems(value: unknown) {
  return listFrom(value, ["evidence"]).map((item) => {
    const record = asRecord(item);
    return {
      document: textOf(record, ["document", "filename", "document_name", "name"]) ?? "Document",
      page: numberOf(record?.page ?? record?.page_number) ?? 1,
      reason: textOf(record, ["reason", "excerpt", "text", "quote"]),
    };
  });
}

function toFinding(value: unknown, caseId: string, index: number): Finding {
  const record = asRecord(value);
  const mapped = mapFindingType(textOf(record, ["type", "finding_type"]));
  const description = textOf(record, ["description", "summary", "title"]) ?? "The ledger returned a finding without a description.";
  const notes = evidenceItems(record?.evidence ?? value);
  const id = textOf(record, ["id", "finding_id"]) ?? `${caseId}:finding:${index}:${mapped.type}`;
  return {
    id,
    caseId,
    type: mapped.type,
    typeLabel: mapped.typeLabel,
    severity: mapSeverity(textOf(record, ["severity"])),
    title: textOf(record, ["title"]) ?? description,
    summary: description,
    impactAmount: numberOf(record?.amount ?? record?.impact_amount ?? record?.impactAmount),
    confidence: normalizeConfidence(record?.confidence),
    evidenceNotes: notes,
    documentIds: [],
    lineItemIds: [],
    recommendation: notes.length > 0 ? "Open the evidence for the page and the reason." : "No evidence was attached to this finding.",
  };
}

function rememberEvidence(caseId: string, findings: Finding[]) {
  for (const id of findingIdsByCase.get(caseId) ?? []) evidenceByFinding.delete(id);
  findingIdsByCase.set(
    caseId,
    findings.map((finding) => finding.id),
  );
  findings.forEach((finding) => {
    const notes = finding.evidenceNotes ?? [];
    evidenceByFinding.set(finding.id, {
      findingId: finding.id,
      headline: finding.title,
      explanation: finding.summary,
      relation: notes.length > 0 ? "supports" : "absent",
      excerpts: notes.map((note, index) => ({
        id: `${finding.id}:evidence:${index}`,
        documentId: note.document,
        documentName: note.document,
        documentType: "other" as const,
        page: note.page,
        section: note.document,
        text: note.reason ?? finding.summary,
        highlight: note.reason ?? "",
        confidence: finding.confidence ?? 0,
      })),
    });
  });
}

function normalizeConfidence(value: unknown) {
  const number = numberOf(value);
  if (number == null) return null;
  const unit = number > 1 ? number / 100 : number;
  return Math.max(0, Math.min(1, unit));
}

function toLedger(payload: unknown, documentCount: number): LiveLedgerFigures {
  const record = asRecord(payload);
  const status = textOf(record, ["status"]) ?? "unknown";
  return {
    status,
    billTotal: numberOf(record?.bill_total ?? record?.billTotal),
    copayPercent: numberOf(record?.copay_percent ?? record?.copayPercent ?? record?.co_pay_percent),
    insuranceShare: numberOf(record?.estimated_insurance_share ?? record?.insurance_share),
    patientShare: numberOf(record?.estimated_patient_share ?? record?.patient_share),
    disclaimer: textOf(record, ["disclaimer"]),
    message: textOf(record, ["message", "detail", "reason", "note"]),
    documentCount,
  };
}

function emptyPatient(): PatientFace {
  return {
    name: null,
    age: null,
    sex: null,
    uhid: null,
    facility: null,
    facilityCity: null,
    admissionAt: null,
    dischargeAt: null,
    lengthOfStayNights: null,
    diagnosis: null,
    procedure: null,
    physician: null,
    payer: null,
    policyNumber: null,
    productName: null,
    tpa: null,
    roomCategory: null,
  };
}

function ledgerNarrative(ledger: LiveLedgerFigures) {
  if (ledger.status === "insufficient_documents") {
    return (
      ledger.message ??
      ledger.disclaimer ??
      "The insurance estimate needs both a hospital bill and a policy. Add the missing document to this case, then re-analyze."
    );
  }
  if (ledger.status === "needs_review") {
    return ledger.message ?? ledger.disclaimer ?? "The ledger asked for a review before an estimate.";
  }
  if (ledger.status === "estimated") {
    return ledger.disclaimer ?? ledger.message ?? "Estimate returned by the ledger.";
  }
  return ledger.message ?? ledger.disclaimer ?? "The ledger did not return an insurance estimate.";
}

function toInsurance(payload: unknown, caseId: string, version: number, documentCount: number): InsuranceAssessment {
  const ledger = toLedger(payload, documentCount);
  const estimated = ledger.status === "estimated";
  return {
    caseId,
    analysisVersion: version,
    policyOnFile: ledger.status !== "insufficient_documents",
    payer: null,
    productName: null,
    policyNumber: null,
    sumInsured: null,
    roomRentCapPerDay: null,
    coPayRate: null,
    proportionateDeduction: false,
    narrative: ledgerNarrative(ledger),
    rows: [],
    denials: [],
    payableTotal: estimated && ledger.insuranceShare != null ? ledger.insuranceShare : 0,
    deniedTotal: 0,
    reviewTotal: 0,
    ledger,
  };
}

function toResults(session: Session): CaseResults {
  const ledger = session.insurance?.ledger ?? null;
  const estimated = ledger?.status === "estimated";
  const limitations = [ledger?.disclaimer, ledger?.message].filter((item, index, all): item is string => Boolean(item) && all.indexOf(item) === index);
  return {
    caseId: session.id,
    analysisVersion: session.version,
    generatedAt: session.updatedAt,
    patient: emptyPatient(),
    totals: {
      billed: estimated && ledger?.billTotal != null ? ledger.billTotal : 0,
      admissible: 0,
      nonPayable: 0,
      underReview: 0,
      patientShare: estimated && ledger?.patientShare != null ? ledger.patientShare : 0,
      insurerApproved: estimated && ledger?.insuranceShare != null ? ledger.insuranceShare : 0,
      coPay: 0,
      currency: "INR",
    },
    score: null,
    scoreLabel: "Not scored by the ledger",
    ledger,
    narrative:
      ledgerNarrative(ledger ?? { status: session.analysisStatus ?? "complete", billTotal: null, copayPercent: null, insuranceShare: null, patientShare: null, disclaimer: null, message: null, documentCount: session.documentCount }) +
      ` ${session.documentCount} document${session.documentCount === 1 ? "" : "s"} on this case.`,
    breakdown: [],
    lineItems: [],
    documentIds: session.documents.map((document) => document.id),
    limitations,
  };
}

function blankSession(id: string): Session {
  const now = new Date().toISOString();
  return {
    id,
    createdAt: now,
    updatedAt: now,
    documents: [],
    findings: [],
    insurance: null,
    results: null,
    messages: readMessages(id),
    analysisStatus: null,
    documentCount: 0,
    phase: "draft",
    error: null,
    version: readMeta()[id]?.version ?? 0,
    stale: false,
    jobStartedAt: null,
    job: null,
  };
}

function sessionFor(id: string) {
  const existing = sessions.get(id);
  if (existing) return existing;
  const created = blankSession(id);
  sessions.set(id, created);
  return created;
}

function applyRemote(session: Session, payload: unknown, findingsPayload?: unknown, insurancePayload?: unknown) {
  const record = asRecord(payload);
  const documents = documentsFrom(record?.documents ?? payload, session.id);
  if (documents.length > 0 || Array.isArray(record?.documents)) session.documents = documents;
  session.documentCount = numberOf(record?.document_count) ?? session.documents.length;
  session.analysisStatus = textOf(record, ["analysis_status", "status"]);
  const findingSource = findingsPayload ?? record?.findings;
  if (findingSource != null) {
    session.findings = listFrom(findingSource, ["findings"]).map((item, index) => toFinding(item, session.id, index));
    rememberEvidence(session.id, session.findings);
  }
  const insuranceSource = insurancePayload ?? record?.insurance;
  if (insuranceSource && typeof insuranceSource === "object") {
    session.insurance = toInsurance(insuranceSource, session.id, session.version, session.documentCount);
  }
  const fingerprint = fingerprintOf(session.documents);
  const meta = readMeta()[session.id];
  const complete = isComplete(session.analysisStatus);
  session.stale = Boolean(meta && complete && meta.fingerprint !== fingerprint);
  session.version = meta?.version ?? session.version;
  session.updatedAt = new Date().toISOString();
  if (session.job) return;
  if (isProcessing(session.analysisStatus)) {
    session.phase = "processing";
    session.jobStartedAt = session.jobStartedAt ?? Date.now();
    return;
  }
  if (isFailed(session.analysisStatus)) {
    session.phase = "failed";
    session.error = session.error ?? "The analysis did not finish. You can re-analyze this same case.";
    return;
  }
  if (complete || session.phase === "ready") {
    session.phase = "ready";
    session.results = toResults(session);
    for (const document of session.documents) document.analysisVersion = session.version || 1;
    return;
  }
  if (session.phase === "failed" && session.error) return;
  session.phase = "draft";
  session.results = null;
}

function isComplete(status: string | null) {
  return status === "complete" || status === "completed" || status === "ready";
}

function isFailed(status: string | null) {
  return status === "failed" || status === "error";
}

function isProcessing(status: string | null) {
  return status === "processing" || status === "running" || status === "analyzing";
}

function stagesFor(startedAt: number | null, done: boolean): { stages: PipelineStage[]; events: PipelineEvent[]; progress: number } {
  const elapsed = startedAt == null ? 0 : Math.max(0, Date.now() - startedAt);
  const activeIndex = done ? LIVE_STAGES.length : Math.min(LIVE_STAGES.length - 2, 1 + Math.floor(elapsed / STAGE_HOLD_MS));
  const stages = LIVE_STAGES.map((stage, index) => ({
    ...stage,
    state: done || index < activeIndex ? "complete" : index === activeIndex ? "active" : "pending",
  })) as PipelineStage[];
  const events: PipelineEvent[] = stages
    .filter((stage) => stage.state !== "pending")
    .map((stage) => ({
      id: `live-${stage.id}`,
      stage: stage.id,
      message: stage.state === "active" ? stage.description : stage.label,
      tone: stage.id === "audit" && done ? "clear" : "neutral",
    }));
  const progress = done ? 1 : Math.min(0.92, (activeIndex + 1) / LIVE_STAGES.length);
  return { stages, events, progress };
}

function summaryOf(session: Session): CaseSummary {
  const ledger = session.insurance?.ledger;
  return {
    id: session.id,
    title: `Case ${session.id.slice(0, 8)}`,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    phase: session.job || isProcessing(session.analysisStatus) ? "processing" : session.phase,
    documentCount: session.documentCount,
    patientName: null,
    facility: null,
    score: null,
    scoreLabel: null,
    billed: ledger?.status === "estimated" ? ledger.billTotal : null,
    analysisVersion: session.version,
    stale: session.stale,
  };
}

function statusOf(session: Session): StatusResponse {
  const running = Boolean(session.job) || (session.phase === "processing" && isProcessing(session.analysisStatus));
  const done = !running && session.phase === "ready";
  const visual = stagesFor(session.jobStartedAt, done);
  if (done) {
    visual.events = [
      ...session.documents.map((document) => ({
        id: `doc-${document.id}`,
        stage: "upload" as const,
        message: `${document.filename}${document.processingState ? ` · ${document.processingState}` : ""}`,
        documentId: document.id,
        tone: "neutral" as const,
      })),
      {
        id: "live-complete",
        stage: "audit",
        message: `Analysis complete · ${session.documentCount} document${session.documentCount === 1 ? "" : "s"} · ${session.findings.length} finding${session.findings.length === 1 ? "" : "s"}`,
        tone: "clear",
      },
    ];
  } else if (running) {
    visual.events = [
      ...session.documents.map((document) => ({
        id: `doc-${document.id}`,
        stage: "extract" as const,
        message: document.filename,
        documentId: document.id,
        tone: "neutral" as const,
      })),
      ...visual.events.filter((event) => event.stage !== "upload"),
    ];
  }
  return {
    case: summaryOf(session),
    documents: session.documents,
    pipeline: {
      phase: running ? "processing" : session.phase,
      stages: running || done ? visual.stages : LIVE_STAGES.map((stage) => ({ ...stage, state: "pending" as const })),
      events: running || done ? visual.events : [],
      progress: running || done ? visual.progress : 0,
      startedAt: session.jobStartedAt ? new Date(session.jobStartedAt).toISOString() : null,
      completedAt: done ? session.updatedAt : null,
      analysisVersion: Math.max(session.version, running ? session.version + 1 : 0),
      error: session.phase === "failed" ? session.error : null,
    },
    messages: session.messages,
    stale: session.stale,
  };
}

function polish(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.code === "unavailable" || error.status === 0) return error;
    if (/pdf|not a|invalid file|unsupported/i.test(error.message)) {
      return new ApiError("That file could not be read as a PDF.", error.status, "invalid_pdf");
    }
    if (/extract/i.test(error.message)) {
      return new ApiError("A document could not be extracted.", error.status, "extraction_failed");
    }
    return new ApiError(error.message || fallback, error.status, error.code);
  }
  return new ApiError(fallback, 500, "api_error");
}

async function refreshSession(session: Session) {
  const [caseBody, findingsBody, insuranceBody] = await Promise.all([
    getCase(session.id),
    getFindingsRequest(session.id).catch(() => null),
    getInsuranceRequest(session.id).catch(() => null),
  ]);
  applyRemote(session, caseBody, findingsBody ?? undefined, insuranceBody ?? undefined);
}

async function ensureRemote(session: Session) {
  if (session.job) return;
  await refreshSession(session);
}

export const httpApi: LedgerApi = {
  async listCases() {
    const ids = readIds();
    if (ids.length === 0) return [];
    const summaries: CaseSummary[] = [];
    let unreachable = 0;
    for (const id of ids) {
      try {
        const session = sessionFor(id);
        if (!session.job) await refreshSession(session);
        summaries.push(summaryOf(session));
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          forgetId(id);
          sessions.delete(id);
          continue;
        }
        if (error instanceof ApiError && (error.status === 0 || error.code === "unavailable")) unreachable += 1;
      }
    }
    if (summaries.length === 0 && unreachable > 0) {
      throw new ApiError(
        "The ledger service is not reachable. Check that FastAPI is running, then try again.",
        0,
        "unavailable",
      );
    }
    return summaries;
  },

  async createCase() {
    try {
      const created = await createCaseRequest();
      const id = caseIdFrom(created);
      rememberId(id);
      const session = blankSession(id);
      sessions.set(id, session);
      return summaryOf(session);
    } catch (error) {
      throw polish(error, "A case could not be opened.");
    }
  },

  async addDocuments(caseId, files) {
    const session = sessionFor(caseId);
    if (session.job) throw new ApiError("Wait for the current analysis to finish before adding documents.", 409, "analysis_in_progress");
    rememberId(caseId);
    try {
      for (const file of files) {
        const uploaded = await uploadDocument(caseId, file);
        const received = documentsFrom(uploaded, caseId, file);
        if (received.length > 0) {
          const known = new Set(session.documents.map((document) => document.filename));
          for (const document of received) {
            if (!known.has(document.filename)) session.documents.push(document);
          }
        }
      }
      await refreshSession(session).catch(() => {
        session.documentCount = session.documents.length;
      });
      if (session.phase === "ready") session.stale = true;
      session.updatedAt = new Date().toISOString();
      return session.documents;
    } catch (error) {
      throw polish(error, "The document could not be uploaded.");
    }
  },

  async updateDocument() {
    throw new ApiError("The live ledger keeps the document type returned with the file.", 405, "unsupported");
  },

  async removeDocument() {
    throw new ApiError("The live ledger does not remove a document from this case.", 405, "unsupported");
  },

  async analyze(caseId) {
    const session = sessionFor(caseId);
    rememberId(caseId);
    if (!session.job) {
      try {
        if (session.documents.length === 0) await refreshSession(session);
      } catch (error) {
        throw polish(error, "This case could not be loaded from the ledger.");
      }
      if (session.documents.length === 0) {
        throw new ApiError("Add a document before starting analysis.", 400, "no_documents");
      }
      session.phase = "processing";
      session.error = null;
      session.results = null;
      session.jobStartedAt = Date.now();
      session.job = analyzeCase(caseId)
        .then(async () => {
          await refreshSession(session);
          session.phase = isFailed(session.analysisStatus) ? "failed" : "ready";
          if (session.phase === "failed") {
            session.error = "The analysis did not finish. You can re-analyze this same case.";
          } else {
            session.version += 1;
            session.analysisStatus = session.analysisStatus ?? "complete";
            session.stale = false;
            writeMeta(session.id, {
              version: session.version,
              fingerprint: fingerprintOf(session.documents),
              updatedAt: new Date().toISOString(),
            });
            session.results = toResults(session);
            for (const document of session.documents) document.analysisVersion = session.version;
          }
        })
        .catch((error: unknown) => {
          const polished = polish(error, "The analysis could not be finished.");
          session.phase = "failed";
          session.error = polished.message;
        })
        .finally(() => {
          session.job = null;
          session.updatedAt = new Date().toISOString();
        });
    }
    return statusOf(session);
  },

  async getStatus(caseId) {
    const session = sessionFor(caseId);
    rememberId(caseId);
    if (!session.job) {
      try {
        await ensureRemote(session);
      } catch (error) {
        throw polish(error, "This case could not be loaded from the ledger.");
      }
      if (!session.job && isProcessing(session.analysisStatus)) {
        session.phase = "processing";
        session.jobStartedAt = session.jobStartedAt ?? Date.now();
      }
    }
    return statusOf(session);
  },

  async getResults(caseId) {
    const session = sessionFor(caseId);
    if (!session.results) {
      await refreshSession(session);
      session.results = toResults(session);
    }
    return session.results;
  },

  async getFindings(caseId) {
    const session = sessionFor(caseId);
    try {
      const payload = await getFindingsRequest(caseId);
      session.findings = listFrom(payload, ["findings"]).map((item, index) => toFinding(item, caseId, index));
      rememberEvidence(caseId, session.findings);
    } catch (error) {
      if (session.findings.length === 0) throw polish(error, "Findings could not be loaded.");
    }
    return session.findings;
  },

  async getInsurance(caseId) {
    const session = sessionFor(caseId);
    try {
      const payload = await getInsuranceRequest(caseId);
      session.insurance = toInsurance(payload, caseId, session.version, session.documentCount);
    } catch (error) {
      if (!session.insurance) throw polish(error, "Insurance could not be loaded.");
    }
    return session.insurance;
  },

  async getEvidence(findingId) {
    const bundle = evidenceByFinding.get(findingId);
    if (!bundle) throw new ApiError("No evidence was returned for that finding.", 404, "not_found");
    return bundle;
  },

  async ask(caseId, question) {
    const text = question.trim();
    if (!text) throw new ApiError("Ask a question about this case.", 400, "empty_question");
    const session = sessionFor(caseId);
    try {
      const payload = await askDocuMend(caseId, text);
      const record = asRecord(payload);
      const answer = textOf(record, ["answer", "text", "message"]);
      if (!answer) throw new ApiError("DocuMend did not return an answer.", 502, "bad_response");
      const notes = evidenceItems(record?.evidence ?? payload);
      const now = new Date().toISOString();
      const user: ChatMessage = { id: `user-${now}`, role: "user", text, createdAt: now };
      const message: ChatMessage = {
        id: `assistant-${now}`,
        role: "assistant",
        text: answer,
        createdAt: now,
        confidence: normalizeConfidence(record?.confidence) ?? undefined,
        citations: notes.map((note) => ({
          documentId: note.document,
          documentName: note.document,
          page: note.page,
          excerpt: note.reason ?? "",
        })),
      };
      session.messages = [...session.messages, user, message];
      writeMessages(caseId, session.messages);
      const response: AskResponse = { message, messages: session.messages };
      return response;
    } catch (error) {
      throw polish(error, "DocuMend could not answer that question.");
    }
  },
};
