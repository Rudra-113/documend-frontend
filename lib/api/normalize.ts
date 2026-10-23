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
  if (!extracted) return null;
  return {
    total: moneyOf(extracted.total ?? extracted.bill_total ?? extracted.grand_total),
    dates: stringList(extracted.dates),
    items: Array.isArray(extracted.items) ? extracted.items.map(itemFrom).filter((item): item is ExtractedItem => item != null) : [],
    diagnosis: textOf(extracted, ["diagnosis"]),
    procedures: stringList(extracted.procedures),
    patientName: textOf(extracted, ["patient_name", "patient", "name"]),
    facility: textOf(extracted, ["facility", "hospital", "hospital_name", "provider"]),
  };
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
