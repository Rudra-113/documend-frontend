import { ApiError } from "@/lib/api/errors";
import type { LedgerApi } from "@/lib/mock/api";

function baseUrl() {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!value) {
    throw new ApiError("NEXT_PUBLIC_API_BASE_URL is not set.", 500, "no_base_url");
  }
  return value.replace(/\/$/, "");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body?.detail ?? body?.message;
    const message = Array.isArray(detail)
      ? detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(" ")
      : typeof detail === "string"
        ? detail
        : response.statusText || "Request failed.";
    throw new ApiError(message || "Request failed.", response.status, body?.code ?? "http_error");
  }
  return body as T;
}

export const httpApi: LedgerApi = {
  listCases() {
    return request("/api/cases");
  },
  createCase(input) {
    return request("/api/cases", { method: "POST", body: JSON.stringify(input ?? {}) });
  },
  addDocuments(caseId, files, types) {
    const form = new FormData();
    files.forEach((file, index) => {
      form.append("files", file);
      form.append("types", types?.[index] ?? "");
    });
    return request(`/api/cases/${caseId}/documents`, { method: "POST", body: form });
  },
  updateDocument(caseId, documentId, input) {
    return request(`/api/cases/${caseId}/documents/${documentId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
  async removeDocument(caseId, documentId) {
    await request(`/api/cases/${caseId}/documents/${documentId}`, { method: "DELETE" });
  },
  analyze(caseId) {
    return request(`/api/cases/${caseId}/analyze`, { method: "POST" });
  },
  getStatus(caseId) {
    return request(`/api/cases/${caseId}/status`);
  },
  getResults(caseId) {
    return request(`/api/cases/${caseId}/results`);
  },
  getFindings(caseId) {
    return request(`/api/cases/${caseId}/findings`);
  },
  getInsurance(caseId) {
    return request(`/api/cases/${caseId}/insurance`);
  },
  getEvidence(findingId) {
    return request(`/api/findings/${findingId}/evidence`);
  },
  ask(caseId, question) {
    return request(`/api/cases/${caseId}/ask`, {
      method: "POST",
      body: JSON.stringify({ question }),
    });
  },
};
