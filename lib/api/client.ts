import { httpApi } from "@/lib/api/http";
import { mockApi, type LedgerApi } from "@/lib/mock/api";

export type { LedgerApi };

export function apiMode(): "mock" | "live" {
  return process.env.NEXT_PUBLIC_API_BASE_URL ? "live" : "mock";
}

function backend(): LedgerApi {
  return apiMode() === "live" ? httpApi : mockApi;
}

export const api: LedgerApi = {
  listCases: () => backend().listCases(),
  createCase: (input) => backend().createCase(input),
  addDocuments: (caseId, files, types) => backend().addDocuments(caseId, files, types),
  updateDocument: (caseId, documentId, input) => backend().updateDocument(caseId, documentId, input),
  removeDocument: (caseId, documentId) => backend().removeDocument(caseId, documentId),
  analyze: (caseId) => backend().analyze(caseId),
  getStatus: (caseId) => backend().getStatus(caseId),
  getResults: (caseId) => backend().getResults(caseId),
  getFindings: (caseId) => backend().getFindings(caseId),
  getInsurance: (caseId) => backend().getInsurance(caseId),
  getEvidence: (findingId) => backend().getEvidence(findingId),
  ask: (caseId, question) => backend().ask(caseId, question),
};
