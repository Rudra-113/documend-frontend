import { ApiError } from "@/lib/api/errors";

export function apiBaseUrl() {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  if (!value) {
    throw new ApiError("NEXT_PUBLIC_API_BASE_URL is not set.", 500, "no_base_url");
  }
  return value;
}

function clip(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean || /traceback|stack trace|exception in/i.test(clean) || clean.length > 240) {
    return "The ledger could not finish that request.";
  }
  return clean;
}

function detailMessage(body: unknown, statusText: string) {
  if (!body || typeof body !== "object") return clip(statusText || "Request failed.");
  const record = body as Record<string, unknown>;
  const detail = record.detail ?? record.message ?? record.error;
  if (typeof detail === "string") return clip(detail);
  if (Array.isArray(detail)) {
    const text = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item && typeof item.msg === "string") return item.msg;
        return "";
      })
      .filter(Boolean)
      .join(" ");
    return clip(text || statusText || "Request failed.");
  }
  return clip(statusText || "Request failed.");
}

export async function apiRequest(path: string, init?: RequestInit): Promise<unknown> {
  const configured = apiBaseUrl();
  const url = typeof window === "undefined" ? `${configured}${path}` : path;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(
      "The ledger service is not reachable. Check that FastAPI is running, then try again.",
      0,
      "unavailable",
    );
  }

  if (response.status === 204) return null;
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = null;
    }
  }
  if (!response.ok) {
    if (!body && response.status >= 500) {
      throw new ApiError(
        "The ledger service is not reachable. Check that FastAPI is running, then try again.",
        response.status,
        "unavailable",
      );
    }
    const message = body ? detailMessage(body, response.statusText) : clip(response.statusText || "Request failed.");
    const code =
      body && typeof body === "object" && "code" in body && typeof body.code === "string" ? body.code : "http_error";
    throw new ApiError(message, response.status, code);
  }
  if (text && body == null) {
    throw new ApiError("The ledger returned a response that could not be read.", response.status, "bad_response");
  }
  return body;
}

export function createCase() {
  return apiRequest("/api/cases", { method: "POST" });
}

export function uploadDocument(caseId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiRequest(`/api/cases/${caseId}/documents`, { method: "POST", body: form });
}

export function analyzeCase(caseId: string) {
  return apiRequest(`/api/cases/${caseId}/analyze`, { method: "POST" });
}

export function getCase(caseId: string) {
  return apiRequest(`/api/cases/${caseId}`);
}

export function getFindings(caseId: string) {
  return apiRequest(`/api/cases/${caseId}/findings`);
}

export function getInsurance(caseId: string) {
  return apiRequest(`/api/cases/${caseId}/insurance`);
}

export function askDocuMend(caseId: string, question: string) {
  return apiRequest(`/api/cases/${caseId}/ask`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}
