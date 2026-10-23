import { analyzeCase, projectStages, type AnalysisOutput } from "@/lib/mock/analyze";
import { answerQuestion } from "@/lib/mock/ask";
import { TYPE_PAGES } from "@/lib/mock/corpus";
import { ACCEPTED_FILE_TYPES, emptyStages, TICK_MS } from "@/lib/mock/stages";
import { ApiError } from "@/lib/api/errors";
import type {
  AskResponse,
  CaseSummary,
  ChatMessage,
  CreateCaseInput,
  DocumentRecord,
  DocumentType,
  EvidenceBundle,
  Finding,
  InsuranceAssessment,
  PipelineEvent,
  PipelineState,
  StatusResponse,
} from "@/lib/types/domain";
import { inferDocumentType } from "@/lib/utils/labels";

const STORAGE_KEY = "documend.ledger.v1";
const MOCK_LIMITATION =
  "This audit was produced by the reference extractor. Document type decides which record is read. Point NEXT_PUBLIC_API_BASE_URL at your FastAPI server to replace it.";

interface Job {
  startedAt: number;
  version: number;
  events: PipelineEvent[];
  output: AnalysisOutput;
}

interface Published {
  version: number;
  completedAt: string;
  events: PipelineEvent[];
  output: AnalysisOutput;
}

interface StoredCase {
  id: string;
  customTitle: string | null;
  createdAt: string;
  updatedAt: string;
  documents: DocumentRecord[];
  messages: ChatMessage[];
  analysisVersion: number;
  job: Job | null;
  published: Published | null;
}

const memory = new Map<string, StoredCase>();
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as StoredCase[];
    if (!Array.isArray(parsed)) return;
    for (const item of parsed) {
      if (item?.id) memory.set(item.id, item);
    }
  } catch {
    // Ignore a corrupt local ledger and start clean.
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...memory.values()]));
  } catch {
    // The audit still lives in memory for this tab.
  }
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeCaseId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  do {
    id = "DM-";
    for (let index = 0; index < 4; index += 1) {
      id += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  } while (memory.has(id));
  return id;
}

function requireCase(caseId: string) {
  hydrate();
  const record = memory.get(caseId);
  if (!record) {
    throw new ApiError("This case is not on this browser.", 404, "not_found");
  }
  return record;
}

function stepsFor(job: Job, now: number) {
  const elapsed = Math.max(0, now - job.startedAt);
  return Math.floor(elapsed / TICK_MS) * 2 + 1;
}

function settle(record: StoredCase, now = Date.now()) {
  if (!record.job) return;
  if (stepsFor(record.job, now) <= record.job.events.length) return;
  const ticksUntilDone = Math.ceil(record.job.events.length / 2);
  const completedAt = new Date(record.job.startedAt + ticksUntilDone * TICK_MS).toISOString();
  const output = record.job.output;
  output.results.generatedAt = completedAt;
  if (!output.results.limitations.includes(MOCK_LIMITATION)) {
    output.results.limitations.push(MOCK_LIMITATION);
  }
  record.published = {
    version: record.job.version,
    completedAt,
    events: record.job.events,
    output,
  };
  record.analysisVersion = record.job.version;
  for (const document of record.documents) {
    document.analysisVersion = record.job.version;
  }
  record.job = null;
  record.updatedAt = completedAt;
  persist();
}

function isStale(record: StoredCase) {
  if (!record.published) return false;
  const sourceIds = record.published.output.results.documentIds;
  if (sourceIds.length !== record.documents.length) return true;
  const ids = new Set(record.documents.map((document) => document.id));
  if (sourceIds.some((id) => !ids.has(id))) return true;
  return record.documents.some((document) => document.analysisVersion !== record.published?.version);
}

function summaryOf(record: StoredCase, now = Date.now()): CaseSummary {
  settle(record, now);
  const phase = record.job ? "processing" : record.published ? "ready" : "draft";
  const results = record.published?.output.results ?? null;
  return {
    id: record.id,
    title: record.customTitle || record.published?.output.suggestedTitle || "Untitled case",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    phase,
    documentCount: record.documents.length,
    patientName: results?.patient.name ?? null,
    facility: results?.patient.facility ?? null,
    score: results?.score ?? null,
    scoreLabel: results?.scoreLabel ?? null,
    billed: results?.totals.billed ?? null,
    analysisVersion: record.job?.version ?? record.published?.version ?? record.analysisVersion,
    stale: isStale(record),
  };
}

function pipelineOf(record: StoredCase, now = Date.now()): PipelineState {
  settle(record, now);
  if (record.job) {
    const revealed = Math.min(record.job.events.length, stepsFor(record.job, now));
    return {
      phase: "processing",
      stages: projectStages(record.job.events, revealed, false),
      events: record.job.events.slice(0, revealed),
      progress: revealed / record.job.events.length,
      startedAt: new Date(record.job.startedAt).toISOString(),
      completedAt: null,
      analysisVersion: record.job.version,
      error: null,
    };
  }
  if (record.published) {
    return {
      phase: "ready",
      stages: emptyStages("complete"),
      events: record.published.events,
      progress: 1,
      startedAt: null,
      completedAt: record.published.completedAt,
      analysisVersion: record.published.version,
      error: null,
    };
  }
  return {
    phase: "draft",
    stages: emptyStages("pending"),
    events: [],
    progress: 0,
    startedAt: null,
    completedAt: null,
    analysisVersion: record.analysisVersion,
    error: null,
  };
}

function statusOf(record: StoredCase): StatusResponse {
  const now = Date.now();
  return {
    case: summaryOf(record, now),
    documents: record.documents,
    pipeline: pipelineOf(record, now),
    messages: record.messages,
    stale: isStale(record),
  };
}

function publishedOutput(record: StoredCase) {
  settle(record);
  if (record.job) {
    throw new ApiError("Analysis is still running.", 409, "analysis_in_progress");
  }
  if (!record.published) {
    throw new ApiError("This case has not been analyzed.", 409, "not_ready");
  }
  return record.published.output;
}

function assertIdle(record: StoredCase) {
  settle(record);
  if (record.job) {
    throw new ApiError("Wait for the current audit to finish before changing documents.", 409, "analysis_in_progress");
  }
}

function pageCount(size: number, mime: string, type: DocumentType) {
  const fromSize = mime.startsWith("image/")
    ? 1
    : Math.max(1, Math.min(48, Math.round(size / 42000) || 1));
  if (type === "other") return fromSize;
  return Math.max(fromSize, TYPE_PAGES[type]);
}

function accepted(file: File) {
  if (ACCEPTED_FILE_TYPES.includes(file.type)) return true;
  return /\.(pdf|png|jpe?g|webp|tiff?|txt)$/i.test(file.name);
}

export const mockApi = {
  async listCases(): Promise<CaseSummary[]> {
    hydrate();
    return [...memory.values()]
      .map((record) => summaryOf(record))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  },

  async createCase(input: CreateCaseInput = {}): Promise<CaseSummary> {
    hydrate();
    await wait(180);
    const now = new Date().toISOString();
    const record: StoredCase = {
      id: makeCaseId(),
      customTitle: input.title?.trim() || null,
      createdAt: now,
      updatedAt: now,
      documents: [],
      messages: [],
      analysisVersion: 0,
      job: null,
      published: null,
    };
    memory.set(record.id, record);
    persist();
    return summaryOf(record);
  },

  async addDocuments(
    caseId: string,
    files: File[],
    types?: Array<DocumentType | undefined>,
  ): Promise<DocumentRecord[]> {
    const record = requireCase(caseId);
    assertIdle(record);
    if (files.length === 0) {
      throw new ApiError("Choose at least one document.", 400, "no_documents");
    }
    await wait(320);
    const created: DocumentRecord[] = [];
    for (const [index, file] of files.entries()) {
      if (file.size > 25 * 1024 * 1024) {
        throw new ApiError(`${file.name} is larger than 25 MB.`, 400, "file_too_large");
      }
      if (!accepted(file)) {
        throw new ApiError(`${file.name} is not a PDF, image, or text file.`, 400, "unsupported_type");
      }
      const inferred = inferDocumentType(file.name);
      const override = types?.[index];
      const type = override ?? inferred.type;
      const document: DocumentRecord = {
        id: uid("doc"),
        caseId,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        pageCount: pageCount(file.size, file.type, type),
        type,
        typeSource: override ? "user" : "inferred",
        classificationConfidence: override ? 1 : inferred.confidence,
        addedAt: new Date().toISOString(),
        analysisVersion: null,
      };
      record.documents.push(document);
      created.push(document);
    }
    record.updatedAt = new Date().toISOString();
    persist();
    return created;
  },

  async updateDocument(
    caseId: string,
    documentId: string,
    input: { type: DocumentType },
  ): Promise<DocumentRecord> {
    const record = requireCase(caseId);
    assertIdle(record);
    const document = record.documents.find((item) => item.id === documentId);
    if (!document) throw new ApiError("That document is not on the case.", 404, "not_found");
    await wait(160);
    document.type = input.type;
    document.typeSource = "user";
    document.classificationConfidence = 1;
    document.pageCount = pageCount(document.sizeBytes ?? 0, document.mimeType, input.type);
    document.analysisVersion = null;
    record.updatedAt = new Date().toISOString();
    persist();
    return document;
  },

  async removeDocument(caseId: string, documentId: string): Promise<void> {
    const record = requireCase(caseId);
    assertIdle(record);
    const index = record.documents.findIndex((item) => item.id === documentId);
    if (index < 0) throw new ApiError("That document is not on the case.", 404, "not_found");
    await wait(160);
    record.documents.splice(index, 1);
    record.updatedAt = new Date().toISOString();
    persist();
  },

  async analyze(caseId: string): Promise<StatusResponse> {
    const record = requireCase(caseId);
    settle(record);
    if (record.job) {
      throw new ApiError("An analysis is already running.", 409, "analysis_in_progress");
    }
    if (record.documents.length === 0) {
      throw new ApiError("Add a document before running the audit.", 400, "no_documents");
    }
    const version = (record.published?.version ?? record.analysisVersion) + 1;
    const output = analyzeCase(record.id, version, record.documents);
    record.job = {
      startedAt: Date.now(),
      version,
      output,
      events: output.events.map((event, index) => ({
        ...event,
        id: `evt-${version}-${index + 1}`,
      })),
    };
    record.updatedAt = new Date().toISOString();
    persist();
    return statusOf(record);
  },

  async getStatus(caseId: string): Promise<StatusResponse> {
    return statusOf(requireCase(caseId));
  },

  async getResults(caseId: string) {
    return publishedOutput(requireCase(caseId)).results;
  },

  async getFindings(caseId: string): Promise<Finding[]> {
    return publishedOutput(requireCase(caseId)).findings;
  },

  async getInsurance(caseId: string): Promise<InsuranceAssessment> {
    return publishedOutput(requireCase(caseId)).insurance;
  },

  async getEvidence(findingId: string): Promise<EvidenceBundle> {
    hydrate();
    await wait(180);
    for (const record of memory.values()) {
      settle(record);
      const bundle = record.published?.output.evidence[findingId];
      if (bundle) return bundle;
    }
    throw new ApiError("No evidence is published for that finding.", 404, "not_found");
  },

  async ask(caseId: string, question: string): Promise<AskResponse> {
    const record = requireCase(caseId);
    const output = publishedOutput(record);
    const text = question.trim();
    if (!text) throw new ApiError("Ask a question about this case.", 400, "empty_question");
    if (text.length > 2000) {
      throw new ApiError("Keep the question under 2,000 characters.", 400, "question_too_long");
    }
    await wait(640);
    const now = new Date().toISOString();
    const user: ChatMessage = {
      id: uid("msg"),
      role: "user",
      text,
      createdAt: now,
    };
    const answered = answerQuestion(text, output, isStale(record));
    const message: ChatMessage = {
      id: uid("msg"),
      role: "assistant",
      text: answered.text,
      createdAt: new Date().toISOString(),
      citations: answered.citations,
      confidence: answered.confidence,
    };
    record.messages.push(user, message);
    record.updatedAt = message.createdAt;
    persist();
    return { message, messages: record.messages };
  },
};

export type LedgerApi = {
  listCases: () => Promise<CaseSummary[]>;
  createCase: (input?: CreateCaseInput) => Promise<CaseSummary>;
  addDocuments: (
    caseId: string,
    files: File[],
    types?: Array<DocumentType | undefined>,
  ) => Promise<DocumentRecord[]>;
  updateDocument: (
    caseId: string,
    documentId: string,
    input: { type: DocumentType },
  ) => Promise<DocumentRecord>;
  removeDocument: (caseId: string, documentId: string) => Promise<void>;
  analyze: (caseId: string) => Promise<StatusResponse>;
  getStatus: (caseId: string) => Promise<StatusResponse>;
  getResults: (caseId: string) => Promise<AnalysisOutput["results"]>;
  getFindings: (caseId: string) => Promise<Finding[]>;
  getInsurance: (caseId: string) => Promise<InsuranceAssessment>;
  getEvidence: (findingId: string) => Promise<EvidenceBundle>;
  ask: (caseId: string, question: string) => Promise<AskResponse>;
};
