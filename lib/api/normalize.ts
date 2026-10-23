import type { DocumentExtraction, ExtractedItem } from "@/lib/types/domain";

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function textOf(record: Record<string, unknown> | null, keys: string[]) {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function moneyOf(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

export function numberOf(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return moneyOf(value);
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

function pageText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (!Array.isArray(value)) return "";
  return value
    .map((page) => (typeof page === "string" ? page : textOf(asRecord(page), ["text", "content"]) ?? ""))
    .filter((item) => item.trim().length > 0)
    .join("\n")
    .trim();
}

function factText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => (typeof item === "string" ? item : textOf(asRecord(item), ["text", "fact"]) ?? ""))
    .filter((item) => item.trim().length > 0)
    .join("\n")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function labeled(text: string, labels: string[]) {
  if (!text) return null;
  for (const label of labels) {
    const match = text.match(new RegExp(`(?:^|\\n)\\s*${escapeRegExp(label)}\\s*[:\\-]\\s*([^\\n]+)`, "i"));
    const value = match?.[1]?.trim();
    if (value) return value;
  }
  return null;
}

function personName(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  return textOf(asRecord(value), ["name", "full_name", "patient_name"]);
}

function facilityFromText(text: string) {
  const labeledValue = labeled(text, ["Facility", "Hospital Name", "Provider", "Nursing Home"]);
  if (labeledValue) return labeledValue;
  const line = text
    .split("\n")
    .map((item) => item.trim())
    .find(
      (item) =>
        item.length > 2 &&
        item.length < 80 &&
        !item.includes(":") &&
        /\b(hospital|clinic|nursing home|medical college|medical centre|medical center)\b/i.test(item) &&
        !/\b(bill|invoice|policy|total|charge)\b/i.test(item),
    );
  return line ?? null;
}

function itemFrom(value: unknown): ExtractedItem | null {
  const record = asRecord(value);
  if (!record) return null;
  const description = textOf(record, ["description", "name", "item", "particulars"]);
  const quantity = numberOf(record.quantity ?? record.qty);
  const unitPrice = moneyOf(record.unit_price ?? record.unitPrice ?? record.rate);
  const amount = moneyOf(record.total ?? record.amount ?? record.line_total);
  if (!description && quantity == null && unitPrice == null && amount == null) return null;
  return {
    description: description ?? "—",
    quantity,
    unitPrice,
    amount,
  };
}

export function extractionFrom(record: Record<string, unknown> | null): DocumentExtraction | null {
  const extracted = asRecord(record?.extracted_data);
  const corpus = [pageText(record?.extracted_text), factText(extracted?.important_facts)].filter(Boolean).join("\n");
  if (!extracted && !corpus) return null;
  const dates = stringList(extracted?.dates);
  if (dates.length === 0) {
    const admission = labeled(corpus, ["Admission Date", "Date of Admission", "Admitted On"]);
    const discharge = labeled(corpus, ["Discharge Date", "Date of Discharge", "Discharged On"]);
    if (admission) dates.push(admission);
    if (discharge) dates.push(discharge);
  }
  return {
    total: moneyOf(extracted?.total ?? extracted?.bill_total ?? extracted?.grand_total),
    dates,
    items: Array.isArray(extracted?.items) ? extracted.items.map(itemFrom).filter((item): item is ExtractedItem => item != null) : [],
    diagnosis: textOf(extracted, ["diagnosis"]) ?? labeled(corpus, ["Final Diagnosis", "Provisional Diagnosis", "Diagnosis"]),
    procedures: stringList(extracted?.procedures),
    patientName:
      textOf(extracted, ["patient_name", "patientName"]) ??
      personName(extracted?.patient) ??
      labeled(corpus, ["Patient Name", "Patient's Name", "Name of Patient", "Patient"]),
    facility: textOf(extracted, ["facility", "hospital_name", "hospital", "provider", "provider_name"]) ?? facilityFromText(corpus),
    uhid: textOf(extracted, ["uhid", "mrn", "ip_number", "ip_no"]) ?? labeled(corpus, ["UHID", "UHID No.", "UHID No", "MRN", "IP No", "IP Number"]),
    payer: textOf(extracted, ["payer", "insurer", "insurance_company", "tpa"]) ?? labeled(corpus, ["Payer", "Insurer", "Insurance Company", "TPA"]),
    policyNumber:
      textOf(extracted, ["policy_number", "policyNumber", "policy_no", "policy_id"]) ??
      labeled(corpus, ["Policy Number", "Policy No.", "Policy No", "Policy ID"]),
  };
}

export function insuranceRecord(payload: unknown): Record<string, unknown> | null {
  const record = asRecord(payload);
  if (!record) return null;
  const nested = asRecord(record.insurance);
  const shaped = (value: Record<string, unknown> | null) =>
    Boolean(
      value &&
        (typeof value.status === "string" ||
          "bill_total" in value ||
          "message" in value ||
          "estimated_patient_share" in value ||
          "estimated_insurance_share" in value ||
          "copay_percent" in value),
    );
  if (shaped(nested) && !shaped(record)) return nested;
  return record;
}

export function unwrapDocument(value: unknown): Record<string, unknown> | null {
  const record = asRecord(value);
  if (!record) return null;
  const nested = asRecord(record.document);
  if (nested && (nested.filename || nested.file_name || nested.extracted_data || nested.id)) return nested;
  return record;
}

export function documentNodes(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];
  if (Array.isArray(record.documents)) return record.documents as unknown[];
  if (record.document) return [record.document];
  if (record.filename || record.file_name || record.name || record.extracted_data) return [record];
  return [];
}
