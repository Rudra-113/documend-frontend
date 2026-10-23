import { FACTS, CORPUS_LINES, type CorpusLine } from "@/lib/mock/corpus";
import { STAGE_ORDER } from "@/lib/mock/stages";
import type {
  BillTotals,
  CaseResults,
  Citation,
  CoverageRowModel,
  CoverageStatus,
  DenialExplanation,
  DocumentRecord,
  DocumentType,
  EvidenceBundle,
  EvidenceExcerpt,
  Finding,
  InsuranceAssessment,
  LineItem,
  PatientFace,
  PipelineEvent,
  ScoreBreakdown,
  Severity,
} from "@/lib/types/domain";
import { formatDay, formatINR } from "@/lib/utils/format";
import { DOCUMENT_TYPE_LABEL } from "@/lib/utils/labels";

export interface AnalysisOutput {
  results: CaseResults;
  findings: Finding[];
  insurance: InsuranceAssessment;
  evidence: Record<string, EvidenceBundle>;
  events: Array<Omit<PipelineEvent, "id">>;
  patientName: string | null;
  facility: string | null;
  suggestedTitle: string;
}

interface Priced {
  line: LineItem;
  corpus: CorpusLine;
  duplicate: boolean;
  allowed: number;
  denied: number;
  review: number;
  status: CoverageStatus;
  rule: string;
  reason: string;
  clause: string | null;
}

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

function has(docs: DocumentRecord[], type: DocumentType) {
  return docs.some((doc) => doc.type === type);
}

function first(docs: DocumentRecord[], type: DocumentType) {
  return docs.find((doc) => doc.type === type);
}

function amountOf(line: CorpusLine) {
  return line.quantity * line.rate;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
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

function knownPatient(docs: DocumentRecord[]): PatientFace {
  const clinical = docs.some((doc) =>
    ["hospital_bill", "discharge_summary", "prescription", "diagnostic_report", "operative_notes", "pre_authorization"].includes(
      doc.type,
    ),
  );
  const policy = has(docs, "insurance_policy");
  if (!clinical && !policy && !has(docs, "receipt")) return emptyPatient();

  const face = emptyPatient();
  if (clinical || has(docs, "receipt") || policy) {
    face.name = FACTS.patientName;
    face.age = FACTS.age;
    face.sex = FACTS.sex;
  }
  if (clinical) {
    face.uhid = FACTS.uhid;
    face.facility = FACTS.facility;
    face.facilityCity = FACTS.facilityCity;
    face.admissionAt = FACTS.admissionAt;
    face.dischargeAt = FACTS.dischargeAt;
    face.lengthOfStayNights = FACTS.nights;
    face.diagnosis = FACTS.diagnosis;
    face.procedure = FACTS.procedure;
    face.physician = FACTS.physician;
    face.roomCategory = has(docs, "hospital_bill") ? FACTS.roomCategory : null;
  }
  if (policy || clinical) {
    face.payer = policy || clinical ? FACTS.payer : null;
  }
  if (policy) {
    face.policyNumber = FACTS.policyNumber;
    face.productName = FACTS.productName;
    face.tpa = FACTS.tpa;
    face.payer = FACTS.payer;
    if (!face.name) face.name = FACTS.patientName;
  }
  return face;
}

function buildLines(bill: DocumentRecord | undefined): Array<{ line: LineItem; corpus: CorpusLine; duplicate: boolean }> {
  if (!bill) return [];
  const seen = new Map<string, number>();
  return CORPUS_LINES.map((corpus, index) => {
    const key = `${corpus.code}|${corpus.serviceDate}|${corpus.rate}|${corpus.description}`;
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    const duplicate = count > 1;
    const line: LineItem = {
      id: `ln-${corpus.code.toLowerCase()}-${index + 1}`,
      code: corpus.code,
      description: corpus.description,
      category: corpus.category,
      serviceDate: corpus.serviceDate,
      quantity: corpus.quantity,
      unit: corpus.unit,
      rate: corpus.rate,
      amount: amountOf(corpus),
      sourceDocumentId: bill.id,
      page: corpus.page,
      findingIds: [],
    };
    return { line, corpus, duplicate };
  });
}

function priceRow(
  entry: { line: LineItem; corpus: CorpusLine; duplicate: boolean },
  policy: boolean,
  receipt: boolean,
): Priced {
  const { line, corpus, duplicate } = entry;
  const billed = line.amount;
  const ratioNum = FACTS.roomCap;
  const ratioDen = FACTS.roomRate;

  if (duplicate) {
    return {
      line,
      corpus,
      duplicate,
      allowed: 0,
      denied: billed,
      review: 0,
      status: "denied",
      rule: "Duplicate charge",
      reason: "Same code, same rate, same timestamp as an earlier line. The repeat is refused.",
      clause: "Billing integrity — duplicate line",
    };
  }

  if (corpus.rule === "non_payable") {
    return {
      line,
      corpus,
      duplicate,
      allowed: 0,
      denied: billed,
      review: 0,
      status: "denied",
      rule: "Non-payable",
      reason: corpus.note ?? "This item is on the standard non-payable list.",
      clause: corpus.clause ?? "IRDAI non-payable list, Annexure I",
    };
  }

  if (corpus.rule === "room_extra") {
    return {
      line,
      corpus,
      duplicate,
      allowed: 0,
      denied: billed,
      review: 0,
      status: "denied",
      rule: "Not a billable night",
      reason: `The bill header discharges the patient at 11:40 on ${formatDay(FACTS.dischargeAt)}, then charges a full deluxe day for that date.`,
      clause: corpus.clause ?? null,
    };
  }

  if (corpus.rule === "review" || (corpus.receiptCheck && receipt)) {
    return {
      line,
      corpus,
      duplicate,
      allowed: 0,
      denied: 0,
      review: billed,
      status: "review",
      rule: corpus.receiptCheck && receipt ? "Possible double collection" : "Held for the record",
      reason:
        corpus.receiptCheck && receipt
          ? "A receipt says these discharge medicines were collected from the patient in cash, while the bill still claims them."
          : (corpus.note ?? "Held until the clinical record supports the charge."),
      clause: corpus.clause ?? null,
    };
  }

  if (!policy) {
    return {
      line,
      corpus,
      duplicate,
      allowed: 0,
      denied: 0,
      review: billed,
      status: "missing_policy",
      rule: "Schedule not on file",
      reason: "This line cannot be admitted or refused until the policy schedule is in the case.",
      clause: null,
    };
  }

  if (corpus.rule === "room_night") {
    const allowed = Math.min(line.rate, FACTS.roomCap) * line.quantity;
    const denied = billed - allowed;
    return {
      line,
      corpus,
      duplicate,
      allowed,
      denied,
      review: 0,
      status: denied > 0 ? "partial" : "payable",
      rule: "Room rent sub-limit",
      reason: `Deluxe is billed at ${formatINR(FACTS.roomRate)}. The schedule caps a private room at ${formatINR(FACTS.roomCap)} a day.`,
      clause: corpus.clause ?? "Schedule cl. 4.2 — room rent sub-limit",
    };
  }

  if (corpus.rule === "proportionate") {
    const allowed = Math.round((billed * ratioNum) / ratioDen);
    const denied = billed - allowed;
    return {
      line,
      corpus,
      duplicate,
      allowed,
      denied,
      review: 0,
      status: "partial",
      rule: "Proportionate deduction",
      reason: `Associated charges follow the room ratio ${formatINR(FACTS.roomCap)} / ${formatINR(FACTS.roomRate)}.`,
      clause: corpus.clause ?? "Schedule cl. 4.3 — proportionate deduction",
    };
  }

  return {
    line,
    corpus,
    duplicate,
    allowed: billed,
    denied: 0,
    review: 0,
    status: "payable",
    rule: "Admissible",
    reason: "No exclusion, cap, or contradiction is attached to this line.",
    clause: null,
  };
}

function quote(
  findingId: string,
  index: number,
  doc: DocumentRecord,
  section: string,
  page: number,
  text: string,
  highlight: string,
  confidence: number,
): EvidenceExcerpt {
  return {
    id: `ev-${findingId}-${index}`,
    documentId: doc.id,
    documentName: doc.filename,
    documentType: doc.type,
    page,
    section,
    text,
    highlight,
    confidence,
  };
}

export function analyzeCase(caseId: string, version: number, documents: DocumentRecord[]): AnalysisOutput {
  const bill = first(documents, "hospital_bill");
  const policy = has(documents, "insurance_policy");
  const discharge = first(documents, "discharge_summary");
  const prescription = first(documents, "prescription");
  const diagnostic = first(documents, "diagnostic_report");
  const receipt = first(documents, "receipt");
  const preAuth = first(documents, "pre_authorization");
  const operative = first(documents, "operative_notes");
  const bills = documents.filter((doc) => doc.type === "hospital_bill");
  const patient = knownPatient(documents);
  const clinical = Boolean(patient.procedure);

  const built = buildLines(bill);
  const priced = built.map((entry) => priceRow(entry, policy, Boolean(receipt)));

  const findings: Finding[] = [];
  const evidence: Record<string, EvidenceBundle> = {};

  const push = (
    finding: Omit<Finding, "id" | "caseId"> & { slug: string },
    bundle: Omit<EvidenceBundle, "findingId">,
  ) => {
    const id = `f${version}-${finding.slug}`;
    const full: Finding = {
      id,
      caseId,
      type: finding.type,
      severity: finding.severity,
      title: finding.title,
      summary: finding.summary,
      impactAmount: finding.impactAmount,
      confidence: finding.confidence,
      documentIds: finding.documentIds,
      lineItemIds: finding.lineItemIds,
      recommendation: finding.recommendation,
    };
    findings.push(full);
    evidence[id] = {
      findingId: id,
      headline: bundle.headline,
      explanation: bundle.explanation,
      relation: bundle.relation,
      excerpts: bundle.excerpts.map((excerpt, index) => ({ ...excerpt, id: `ev-${id}-${index + 1}`, findingId: undefined }) as EvidenceExcerpt),
    };
  };

  const lineByCode = (code: string) => priced.filter((row) => row.line.code === code);

  if (bill && lineByCode("PHA-PAN40").some((row) => row.duplicate)) {
    const rows = lineByCode("PHA-PAN40");
    const dup = rows.find((row) => row.duplicate)!;
    const confidence = 0.93;
    push(
      {
        slug: "dup-pantoprazole",
        type: "duplicate",
        severity: "high",
        title: "Pantoprazole IV is billed twice for the same minute",
        summary: `Two identical lines for Inj. Pantoprazole 40 mg IV sit on 14 Oct at the same rate. The repeat is ${formatINR(dup.line.amount)}.`,
        impactAmount: dup.line.amount,
        confidence,
        documentIds: [bill.id],
        lineItemIds: rows.map((row) => row.line.id),
        recommendation: "Drop the second line before the claim goes to the TPA. Keep the first dose if the drug chart supports it.",
      },
      {
        headline: "Same drug, same minute, two charges",
        explanation: "The ledger repeats a single IV dose. Nothing in the line detail separates them.",
        relation: "supports",
        excerpts: [
          quote("tmp", 1, bill, "Pharmacy", 4, "14 Oct 2026  09:10  PHA-PAN40  Inj. Pantoprazole 40 mg IV  Qty 1  Rate 920.00  Amount 920.00", "09:10", confidence),
          quote("tmp", 2, bill, "Pharmacy", 4, "14 Oct 2026  09:10  PHA-PAN40  Inj. Pantoprazole 40 mg IV  Qty 1  Rate 920.00  Amount 920.00", "Amount 920.00", confidence),
        ],
      },
    );
  }

  const gloves = lineByCode("CONS-GLOVE")[0];
  if (gloves) {
    const expected = 12;
    const excess = gloves.line.quantity - expected;
    const confidence = operative ? 0.91 : discharge ? 0.78 : 0.7;
    const excerpts = [
      quote("tmp", 1, bill!, "Consumables", 3, `CONS-GLOVE  Surgical gloves, sterile pair  Qty ${gloves.line.quantity}  Rate 130.00  Amount ${formatINR(gloves.line.amount)}.`, `Qty ${gloves.line.quantity}`, confidence),
    ];
    if (operative) {
      excerpts.push(
        quote("tmp", 2, operative, "Counts", 1, "Four ports. Gloves opened: eight pairs. No additional sets requested. Count correct at close.", "eight pairs", 0.9),
      );
    } else if (discharge) {
      excerpts.push(
        quote("tmp", 2, discharge, "Procedure", 1, "Uneventful four-port laparoscopic cholecystectomy. No conversion. No additional procedure.", "four-port", 0.74),
      );
    }
    push(
      {
        slug: "qty-gloves",
        type: "quantity_anomaly",
        severity: "high",
        title: "Forty-eight pairs of gloves for a four-port procedure",
        summary: `A laparoscopic cholecystectomy usually opens 8–12 pairs. The bill posts ${gloves.line.quantity}. The excess over 12 pairs is ${formatINR(excess * gloves.line.rate)}. Gloves are also on the non-payable list, so the whole ${formatINR(gloves.line.amount)} is unlikely to be paid.`,
        impactAmount: excess * gloves.line.rate,
        confidence,
        documentIds: [bill!.id, operative?.id, discharge?.id].filter(Boolean) as string[],
        lineItemIds: [gloves.line.id],
        recommendation: operative
          ? "The operative note records eight pairs. Ask the billing office to reverse the remaining forty."
          : "Ask the OT for the count sheet. Even a justified quantity is unlikely to be paid: gloves sit on the non-payable list.",
      },
      {
        headline: "Quantity against the procedure that was actually done",
        explanation: operative
          ? "The operative note and the bill do not describe the same count."
          : "The quantity stands out for this procedure. The OT count is not on file, so the figure is not fully pinned.",
        relation: operative || discharge ? "conflicts" : "supports",
        excerpts,
      },
    );
  }

  const extraRoom = lineByCode("RM-DELUXE").find((row) => row.corpus.rule === "room_extra");
  if (extraRoom && bill) {
    const confidence = discharge ? 0.95 : 0.8;
    const excerpts = [
      quote("tmp", 1, bill, "Bill header", 1, "Admitted 12 Oct 2026, 14:20. Discharged 16 Oct 2026, 11:40. Consultant: Dr. R. Mehra.", "11:40", confidence),
      quote("tmp", 2, bill, "Room", 2, "16 Oct 2026  RM-DELUXE  Deluxe single room  Qty 1  Rate 12,500.00  Amount 12,500.00", "16 Oct 2026", confidence),
    ];
    if (discharge) {
      excerpts.push(
        quote("tmp", 3, discharge, "Disposition", 2, "Patient discharged in stable condition at 11:40 on 16 October 2026. Room vacated at discharge. No overnight stay on the 16th.", "Room vacated at discharge", 0.94),
      );
    }
    push(
      {
        slug: "room-extra-day",
        type: "contradiction",
        severity: "critical",
        title: "A full room day is charged on the discharge morning",
        summary: `The stay is the nights of 12–15 Oct. Discharge is 16 Oct at 11:40, and the bill still posts a deluxe day of ${formatINR(extraRoom.line.amount)} for the 16th.`,
        impactAmount: extraRoom.line.amount,
        confidence,
        documentIds: [bill.id, discharge?.id].filter(Boolean) as string[],
        lineItemIds: [extraRoom.line.id],
        recommendation: "Remove the 16 Oct room line. The four earlier nights are the stay.",
      },
      {
        headline: "Header and charge line disagree",
        explanation: discharge
          ? "The bill and the discharge summary both end the stay on the morning of 16 Oct."
          : "The contradiction is inside the bill: the header and the room ledger do not match. A discharge summary would confirm it.",
        relation: "conflicts",
        excerpts,
      },
    );
  }

  const drain = lineByCode("CONS-DRAIN")[0];
  if (drain && bill) {
    const corroborated = Boolean(discharge || operative);
    const confidence = discharge && operative ? 0.96 : corroborated ? 0.9 : 0.46;
    const excerpts = [
      quote("tmp", 1, bill, "Consumables", 3, "CONS-DRAIN  Abdominal drain set  Qty 1  Amount 2,200.00  Posted to the OT package.", "Abdominal drain set", confidence),
    ];
    if (discharge) {
      excerpts.push(
        quote("tmp", 2, discharge, "Operative note excerpt", 1, "No drain was placed. Port sites dry. Abdomen soft at discharge.", "No drain was placed", 0.93),
      );
    }
    if (operative) {
      excerpts.push(
        quote("tmp", 3, operative, "Closure", 2, "Hemostasis secured. Drain: not placed. Ports closed.", "Drain: not placed", 0.95),
      );
    }
    push(
      {
        slug: "drain",
        type: corroborated ? "contradiction" : "coverage_gap",
        severity: corroborated ? "high" : "medium",
        title: corroborated ? "A drain is billed. The record says none was placed." : "Drain charge has no operative corroboration",
        summary: corroborated
          ? `The bill charges ${formatINR(drain.line.amount)} for an abdominal drain set. ${discharge ? "The discharge summary says no drain was placed." : "The operative note says a drain was not placed."}`
          : `The bill charges ${formatINR(drain.line.amount)} for a drain. Neither the discharge summary nor the operative note is on file.`,
        impactAmount: drain.line.amount,
        confidence,
        documentIds: [bill.id, discharge?.id, operative?.id].filter(Boolean) as string[],
        lineItemIds: [drain.line.id],
        recommendation: corroborated
          ? "Reverse the drain line unless a count sheet shows one was opened and used."
          : "Upload the operative note and the discharge summary before treating this as payable.",
      },
      {
        headline: corroborated ? "Charge against the clinical record" : "Charge without a supporting record",
        explanation: corroborated
          ? "The clinical documents on file deny the item the bill is selling."
          : "There is nothing in the case yet that confirms or refutes the drain.",
        relation: corroborated ? "conflicts" : "absent",
        excerpts,
      },
    );
  }

  const mrcp = lineByCode("INV-MRCP")[0];
  if (mrcp && bill) {
    const corroborated = Boolean(discharge || diagnostic);
    const confidence = discharge && diagnostic ? 0.92 : corroborated ? 0.84 : 0.44;
    const excerpts = [
      quote("tmp", 1, bill, "Investigations", 3, "INV-MRCP  MR cholangiopancreatography  Qty 1  Amount 7,500.00", "MR cholangiopancreatography", confidence),
    ];
    if (diagnostic) {
      excerpts.push(
        quote("tmp", 2, diagnostic, "Impression", 1, "USG abdomen: multiple gallstones. CBD 4 mm, no filling defect. No MRCP in this study.", "No MRCP in this study", 0.9),
      );
    }
    if (discharge) {
      excerpts.push(
        quote("tmp", 3, discharge, "Imaging", 2, "Imaging: ultrasound abdomen only. CBD normal. MRCP not performed.", "MRCP not performed", 0.9),
      );
    }
    push(
      {
        slug: "mrcp",
        type: corroborated ? "contradiction" : "coverage_gap",
        severity: corroborated ? "high" : "medium",
        title: corroborated ? "MRCP is charged. The record says it was not done." : "MRCP charge is not mentioned in any clinical note",
        summary: corroborated
          ? `${formatINR(mrcp.line.amount)} is billed for an MRCP. The papers on file describe an ultrasound only.`
          : `${formatINR(mrcp.line.amount)} is billed for an MRCP, and no report or discharge summary is on file to support it.`,
        impactAmount: mrcp.line.amount,
        confidence,
        documentIds: [bill.id, diagnostic?.id, discharge?.id].filter(Boolean) as string[],
        lineItemIds: [mrcp.line.id],
        recommendation: "Produce the MRCP images and report, or remove the line. The pre-authorization does not include it.",
      },
      {
        headline: "A study the file does not describe",
        explanation: corroborated
          ? "Ultrasound and discharge language leave no room for an MRCP on this admission."
          : "Support is missing, not disproved.",
        relation: corroborated ? "conflicts" : "absent",
        excerpts,
      },
    );
  }

  const cbc = lineByCode("INV-CBC")[0];
  if (cbc && bill) {
    const expected = 4;
    const excess = cbc.line.quantity - expected;
    const confidence = discharge ? 0.76 : 0.58;
    const excerpts = [
      quote("tmp", 1, bill, "Investigations", 3, `INV-CBC  Complete blood count  Qty ${cbc.line.quantity}  Rate 450.00  Amount ${cbc.line.amount}.00`, `Qty ${cbc.line.quantity}`, confidence),
    ];
    if (discharge) {
      excerpts.push(
        quote("tmp", 2, discharge, "Hospital course", 2, "One fever spike of 100.4°F on 14 Oct, settled without escalation. A CBC was sent that evening.", "A CBC was sent that evening", 0.8),
      );
    }
    push(
      {
        slug: "qty-cbc",
        type: "quantity_anomaly",
        severity: "medium",
        title: "Six blood counts across four nights",
        summary: discharge
          ? `The discharge summary supports a pre-operative count, a post-operative count, one febrile repeat, and a discharge count. The bill posts ${cbc.line.quantity}. Two counts, ${formatINR(excess * cbc.line.rate)}, are not accounted for.`
          : `Six complete blood counts are billed for a four-night stay. Without the course notes, two of them have no stated reason.`,
        impactAmount: excess * cbc.line.rate,
        confidence,
        documentIds: [bill.id, discharge?.id].filter(Boolean) as string[],
        lineItemIds: [cbc.line.id],
        recommendation: "Match each draw to an order. Remove the counts that have no order.",
      },
      {
        headline: "Count against the course",
        explanation: "Quantity is the issue. The test itself is ordinary for this admission.",
        relation: discharge ? "conflicts" : "supports",
        excerpts,
      },
    );
  }

  const antibiotic = lineByCode("PHA-CEFTRIAX")[0];
  if (antibiotic && bill) {
    const expected = 5;
    const excess = antibiotic.line.quantity - expected;
    const confidence = prescription ? 0.74 : 0.6;
    const excerpts = [
      quote("tmp", 1, bill, "Pharmacy", 4, `PHA-CEFTRIAX  Inj. Ceftriaxone 1 g IV  Qty ${antibiotic.line.quantity}  Rate 640.00`, `Qty ${antibiotic.line.quantity}`, confidence),
    ];
    if (prescription) {
      excerpts.push(
        quote("tmp", 2, prescription, "Discharge medicines", 1, "Tab. Cefuroxime 500 mg twice daily for five days, starting on discharge. Stop IV antibiotics at discharge.", "Stop IV antibiotics at discharge", 0.8),
      );
    }
    push(
      {
        slug: "qty-ceftriaxone",
        type: "quantity_anomaly",
        severity: "medium",
        title: "Seven IV antibiotic doses in a shorter stay",
        summary: `Ceftriaxone is posted as ${antibiotic.line.quantity} doses. The admission runs across five calendar dates, and the discharge plan steps down to oral cefuroxime. ${excess} doses, ${formatINR(excess * antibiotic.line.rate)}, sit outside that span.`,
        impactAmount: excess * antibiotic.line.rate,
        confidence,
        documentIds: [bill.id, prescription?.id].filter(Boolean) as string[],
        lineItemIds: [antibiotic.line.id],
        recommendation: "Reconcile the drug chart. Doses after discharge, or a double post, should come off.",
      },
      {
        headline: "Duration against the stay",
        explanation: prescription
          ? "The prescription ends IV antibiotics at discharge. It does not explain two extra doses."
          : "The quantity exceeds the length of stay. The drug chart is not on file.",
        relation: prescription ? "conflicts" : "supports",
        excerpts,
      },
    );
  }

  const oralIds = priced.filter((row) => row.corpus.receiptCheck).map((row) => row.line.id);
  const oralTotal = priced.filter((row) => row.corpus.receiptCheck).reduce((sum, row) => sum + row.line.amount, 0);
  if (receipt && bill && oralTotal > 0) {
    const confidence = 0.86;
    push(
      {
        slug: "receipt-double",
        type: "contradiction",
        severity: "medium",
        title: "Discharge medicines may have been collected twice",
        summary: `The pharmacy receipt records ${formatINR(oralTotal)} received in cash from the patient. The same tablets are still lines on the hospital bill.`,
        impactAmount: oralTotal,
        confidence,
        documentIds: [bill.id, receipt.id],
        lineItemIds: oralIds,
        recommendation: "If the patient already paid, those lines cannot also be claimed. Attach the receipt to the query.",
      },
      {
        headline: "Cash receipt against the claim",
        explanation: "One payment path has to be withdrawn.",
        relation: "conflicts",
        excerpts: [
          quote("tmp", 1, receipt, "Settlement", 1, "Received from patient, cash, ₹520. Tab. Cefuroxime 500 mg × 10. Tab. Pantoprazole 40 mg × 10. 16 Oct 2026.", "Received from patient, cash", confidence),
          quote("tmp", 2, bill, "Pharmacy", 5, "PHA-CEFUROX  Tab. Cefuroxime 500 mg  340.00. PHA-PAN-ORAL  Tab. Pantoprazole 40 mg  180.00. Both posted to the inpatient bill.", "posted to the inpatient bill", 0.84),
        ],
      },
    );
  }

  if (preAuth && bill) {
    const roomLines = lineByCode("RM-DELUXE").length;
    const confidence = 0.9;
    push(
      {
        slug: "preauth-scope",
        type: "contradiction",
        severity: "high",
        title: "The stay is outside the pre-authorization",
        summary: `${FACTS.preAuthId} approved ${formatINR(FACTS.preAuthAmount)} for ${FACTS.preAuthNights} nights in a ${FACTS.preAuthRoom.toLowerCase()} room. The bill posts ${roomLines} deluxe days. The rupee ceiling still covers the total, but the room category and the length do not.`,
        impactAmount: null,
        confidence,
        documentIds: [preAuth.id, bill.id],
        lineItemIds: lineByCode("RM-DELUXE").map((row) => row.line.id),
        recommendation: "File an enhancement for the extra night and the deluxe category, or accept the room-rent deduction.",
      },
      {
        headline: "Approval against what was billed",
        explanation: "The approved amount is higher than this bill. The breach is scope: nights and room class, plus an MRCP the approval does not mention.",
        relation: "conflicts",
        excerpts: [
          quote("tmp", 1, preAuth, "Authorization", 1, `${FACTS.preAuthId}. Approved amount ₹3,40,000. Room: semi-private. Authorized stay: 3 nights. Procedure: laparoscopic cholecystectomy. MRCP: not included.`, "3 nights", confidence),
          quote("tmp", 2, bill, "Room", 2, "Room category billed: Deluxe single at ₹12,500 per day. Room lines posted: 12, 13, 14, 15 and 16 Oct 2026.", "Deluxe single", 0.88),
        ],
      },
    );
  }

  if (bills.length > 1) {
    push(
      {
        slug: "two-bills",
        type: "duplicate",
        severity: "medium",
        title: "More than one hospital bill is on file",
        summary: `${bills.length} documents are classified as hospital bills. The ledger was read from ${bills[0].filename}. The others were not merged.`,
        impactAmount: null,
        confidence: 0.62,
        documentIds: bills.map((doc) => doc.id),
        lineItemIds: [],
        recommendation: "Mark the final bill and remove drafts, or the same charge can be counted twice.",
      },
      {
        headline: "Which bill is the claim?",
        explanation: "Only the first hospital bill was parsed. Reclassify a draft if it is not the final account.",
        relation: "supports",
        excerpts: bills.slice(0, 3).map((doc, index) =>
          quote("tmp", index + 1, doc, "File", 1, `${doc.filename} is classified as a hospital bill.`, doc.filename, 0.62),
        ),
      },
    );
  }

  const nonPayableRows = priced.filter((row) => row.corpus.rule === "non_payable");
  if (nonPayableRows.length > 0 && bill) {
    const impact = nonPayableRows.reduce((sum, row) => sum + row.line.amount, 0);
    push(
      {
        slug: "non-payable",
        type: "non_payable",
        severity: "high",
        title: "Standard non-payable items are inside the bill",
        summary: `${nonPayableRows.length} lines, ${formatINR(impact)}, match the usual exclusion list: gloves, an admission kit, toiletries, attendant food, documentation, registration, and luxury tax. These do not need the schedule to be refused.`,
        impactAmount: impact,
        confidence: 0.9,
        documentIds: [bill.id, policy ? first(documents, "insurance_policy")!.id : ""].filter(Boolean),
        lineItemIds: nonPayableRows.map((row) => row.line.id),
        recommendation: "Move these off the claim. Gloves are also a quantity problem — see that finding before arguing the clinical count.",
      },
      {
        headline: "Lines a payer refuses as a class",
        explanation: "These are exclusions of kind, not a judgement on whether the stay was medically necessary.",
        relation: "supports",
        excerpts: [
          quote(
            "tmp",
            1,
            bill,
            "Other charges",
            5,
            "OTH-ADMKIT Admission kit 1,850. OTH-TOILET Toiletries 640. OTH-ATTDIET Attendant diet 1,800. OTH-DOCS Documentation 1,500. OTH-REG Registration 500. TAX-LUX Luxury tax 3,125. CONS-GLOVE Gloves 6,240.",
            "Admission kit",
            0.9,
          ),
          ...(policy
            ? [
                quote(
                  "tmp",
                  2,
                  first(documents, "insurance_policy")!,
                  "Exclusions",
                  3,
                  "Annexure: expenses on the IRDAI non-payable list are excluded, including registration, toiletries, attendant meals, documentation charges, gloves, and taxes.",
                  "non-payable list",
                  0.88,
                ),
              ]
            : []),
        ],
      },
    );
  }

  const roomNights = priced.filter((row) => row.corpus.rule === "room_night");
  const roomExcess = roomNights.reduce((sum, row) => sum + row.denied, 0);
  if (policy && bill && roomExcess > 0) {
    const policyDoc = first(documents, "insurance_policy")!;
    push(
      {
        slug: "room-cap",
        type: "coverage_gap",
        severity: "high",
        title: "Deluxe room sits above the policy cap",
        summary: `Four nights are real. Each is billed at ${formatINR(FACTS.roomRate)} against a cap of ${formatINR(FACTS.roomCap)}. The category difference is ${formatINR(roomExcess)}, before the discharge-day line.`,
        impactAmount: roomExcess,
        confidence: 0.92,
        documentIds: [bill.id, policyDoc.id],
        lineItemIds: roomNights.map((row) => row.line.id),
        recommendation: "Expect the cap to be applied per night. The upgrade is a patient share unless an enhancement says otherwise.",
      },
      {
        headline: "Cap against the room that was occupied",
        explanation: "This is a term of the schedule, not a finding that the room was unoccupied.",
        relation: "conflicts",
        excerpts: [
          quote("tmp", 1, policyDoc, "Room rent", 2, "Private room eligible up to ₹8,000 per day. A higher category reduces associated charges in the same proportion. Suite and deluxe upgrades are not fully admitted.", "₹8,000 per day", 0.93),
          quote("tmp", 2, bill, "Room", 2, "RM-DELUXE  Deluxe single room  ₹12,500 per day, posted for 12, 13, 14 and 15 Oct 2026.", "₹12,500 per day", 0.9),
        ],
      },
    );
  }

  const proportionate = priced.filter((row) => row.corpus.rule === "proportionate");
  const proportionateDenied = proportionate.reduce((sum, row) => sum + row.denied, 0);
  if (policy && bill && proportionateDenied > 0) {
    const policyDoc = first(documents, "insurance_policy")!;
    push(
      {
        slug: "proportionate",
        type: "coverage_gap",
        severity: "high",
        title: "Surgeon, theatre, and visits are cut with the room",
        summary: `Because the room exceeds the cap, associated charges are admitted at ${FACTS.roomCap}/${FACTS.roomRate}. That deduction is ${formatINR(proportionateDenied)} across surgery, anesthesia, theatre, nursing, RMO, and visits.`,
        impactAmount: proportionateDenied,
        confidence: 0.9,
        documentIds: [bill.id, policyDoc.id],
        lineItemIds: proportionate.map((row) => row.line.id),
        recommendation: "Quote clause 4.3 in the patient explanation. This is a formula, not a dispute about whether the surgery happened.",
      },
      {
        headline: "The room ratio applied to the procedure",
        explanation: "Proportionate deduction follows the room the patient chose, not a second clinical review.",
        relation: "supports",
        excerpts: [
          quote("tmp", 1, policyDoc, "Proportionate deduction", 2, "Where the room rent opted exceeds the eligible rent, professional fees, theatre, and nursing are paid in the ratio of eligible rent to actual rent.", "ratio of eligible rent", 0.92),
          quote("tmp", 2, bill, "Professional fees", 2, "Surgeon fee ₹85,000. Anesthetist ₹25,000. OT charges ₹42,000. Nursing, RMO, and visits are posted at full deluxe-category rates.", "Surgeon fee ₹85,000", 0.86),
        ],
      },
    );
  }

  const expected: Array<{ type: DocumentType; severity: Severity; why: string }> = [
    { type: "hospital_bill", severity: "critical", why: "Without the bill there is no ledger to audit." },
    { type: "discharge_summary", severity: "high", why: "Dates, the drain, and the imaging story are confirmed here." },
    { type: "insurance_policy", severity: "high", why: "Room cap, proportionate deduction, and co-pay live in the schedule." },
  ];
  if (clinical || bill) {
    expected.push(
      { type: "pre_authorization", severity: "high", why: "A planned surgery should carry the approval and its limits." },
      { type: "operative_notes", severity: "high", why: "Glove count, drain, and the actual procedure are settled in the OT note." },
      { type: "diagnostic_report", severity: "medium", why: "The ultrasound is what makes the MRCP charge testable." },
      { type: "prescription", severity: "medium", why: "Discharge medicines explain the antibiotic step-down." },
    );
  }

  for (const item of expected) {
    if (has(documents, item.type)) continue;
    const anchor = bill || discharge || preAuth || first(documents, "insurance_policy");
    const excerpts: EvidenceExcerpt[] = [];
    if (anchor && anchor.type !== item.type) {
      excerpts.push(
        quote(
          "tmp",
          1,
          anchor,
          "What the file already shows",
          1,
          anchor.type === "hospital_bill"
            ? "Procedure billed: laparoscopic cholecystectomy. A surgical claim expects the bill, the discharge summary, the policy, the pre-authorization, and the operative note."
            : `${DOCUMENT_TYPE_LABEL[anchor.type]} is on file. ${item.why}`,
          item.type === "hospital_bill" ? "no ledger" : DOCUMENT_TYPE_LABEL[item.type],
          0.8,
        ),
      );
    }
    push(
      {
        slug: `missing-${item.type}`,
        type: "missing_document",
        severity: item.severity,
        title: `${DOCUMENT_TYPE_LABEL[item.type]} is not in the case`,
        summary: item.why,
        impactAmount: null,
        confidence: 0.97,
        documentIds: anchor ? [anchor.id] : [],
        lineItemIds: [],
        recommendation: `Add the ${DOCUMENT_TYPE_LABEL[item.type].toLowerCase()} and re-analyze. Findings that depend on it will tighten or fall away.`,
      },
      {
        headline: "Expected, and absent",
        explanation: item.why,
        relation: "absent",
        excerpts,
      },
    );
  }

  const unclassified = documents.filter((doc) => doc.type === "other");
  if (unclassified.length > 0) {
    push(
      {
        slug: "unclassified",
        type: "missing_document",
        severity: "info",
        title: "Some files have no document type",
        summary: `${unclassified.map((doc) => doc.filename).join(", ")} ${unclassified.length === 1 ? "was" : "were"} not classified. They were ignored by the extractor.`,
        impactAmount: null,
        confidence: 0.5,
        documentIds: unclassified.map((doc) => doc.id),
        lineItemIds: [],
        recommendation: "Set a type on each file and re-analyze. The filename is only a guess.",
      },
      {
        headline: "Not read as a medical record",
        explanation: "Unclassified files do not contribute lines, clauses, or contradictions.",
        relation: "absent",
        excerpts: unclassified.slice(0, 4).map((doc, index) =>
          quote("tmp", index + 1, doc, "Upload", 1, `${doc.filename} has no document type.`, doc.filename, 0.4),
        ),
      },
    );
  }

  findings.sort((a, b) => {
    const severity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (severity !== 0) return severity;
    return (b.impactAmount ?? 0) - (a.impactAmount ?? 0);
  });

  const findingIdsByLine = new Map<string, string[]>();
  for (const finding of findings) {
    for (const lineId of finding.lineItemIds) {
      const list = findingIdsByLine.get(lineId) ?? [];
      list.push(finding.id);
      findingIdsByLine.set(lineId, list);
    }
  }
  for (const row of priced) {
    row.line.findingIds = findingIdsByLine.get(row.line.id) ?? [];
  }

  const billed = priced.reduce((sum, row) => sum + row.line.amount, 0);
  const admissible = priced.reduce((sum, row) => sum + row.allowed, 0);
  const deniedTotal = priced.reduce((sum, row) => sum + row.denied, 0);
  const reviewTotal = priced.reduce((sum, row) => sum + row.review, 0);
  const nonPayable = nonPayableRows.reduce((sum, row) => sum + row.line.amount, 0);
  const coPay = policy ? Math.round(admissible * FACTS.coPayRate) : 0;
  const insurerApproved = admissible - coPay;
  const patientShare = deniedTotal + coPay;

  const totals: BillTotals = {
    billed,
    admissible,
    nonPayable,
    underReview: reviewTotal,
    patientShare,
    insurerApproved,
    coPay,
    currency: "INR",
  };

  const rows: CoverageRowModel[] = priced.map((row) => ({
    id: `cov-${row.line.id}`,
    lineItemId: row.line.id,
    label: row.line.description,
    category: row.line.category,
    billed: row.line.amount,
    allowed: row.allowed,
    denied: row.denied,
    review: row.review,
    status: row.status,
    rule: row.rule,
    reason: row.reason,
    clause: row.clause,
  }));

  const denials = buildDenials({
    caseId,
    policy,
    priced,
    findings,
    totals,
    documents,
  });

  const presentExpected = expected.filter((item) => has(documents, item.type)).length;
  const completeness = expected.length === 0 ? 0 : (presentExpected / expected.length) * 100;
  const contradictions = findings.filter((finding) => finding.type === "contradiction").length;
  const gaps = findings.filter((finding) => finding.type === "coverage_gap").length;
  const duplicates = findings.filter((finding) => finding.type === "duplicate").length;
  const quantities = findings.filter((finding) => finding.type === "quantity_anomaly").length;
  const consistency = clampScore(100 - contradictions * 16 - gaps * 6);
  const billingIntegrity = clampScore(100 - duplicates * 18 - quantities * 12);
  const insuranceAlignment = !bill
    ? 10
    : policy
      ? clampScore(billed === 0 ? 0 : ((billed - reviewTotal) / billed) * 100)
      : clampScore(15 + (billed === 0 ? 0 : (deniedTotal / billed) * 40));
  const evidenced = findings.filter((finding) => (evidence[finding.id]?.excerpts.length ?? 0) > 0);
  const evidenceStrength =
    evidenced.length === 0
      ? 35
      : clampScore(
          (evidenced.reduce((sum, finding) => sum + (finding.confidence ?? 0), 0) / evidenced.length) * 100,
        );

  const breakdown: ScoreBreakdown[] = [
    {
      key: "completeness",
      label: "Completeness",
      score: clampScore(completeness),
      note: `${presentExpected} of ${expected.length} expected records are on file.`,
    },
    {
      key: "consistency",
      label: "Consistency",
      score: consistency,
      note:
        contradictions === 0
          ? "No cross-document contradiction was raised."
          : `${contradictions} contradiction${contradictions === 1 ? "" : "s"} between documents.`,
    },
    {
      key: "billing_integrity",
      label: "Billing integrity",
      score: billingIntegrity,
      note:
        duplicates + quantities === 0
          ? "No duplicate or quantity anomaly was raised."
          : `${duplicates} duplicate finding${duplicates === 1 ? "" : "s"}, ${quantities} quantity finding${quantities === 1 ? "" : "s"}.`,
    },
    {
      key: "insurance_alignment",
      label: "Insurance alignment",
      score: insuranceAlignment,
      note: !bill
        ? "There is no bill to align."
        : policy
          ? `${formatINR(reviewTotal)} of ${formatINR(billed)} is still unclassified.`
          : "The schedule is missing, so most lines cannot be priced.",
    },
    {
      key: "evidence_strength",
      label: "Evidence strength",
      score: evidenceStrength,
      note:
        evidenced.length === 0
          ? "Findings are not pinned to a page yet."
          : `Mean confidence across ${evidenced.length} evidenced findings.`,
    },
  ];

  const score = clampScore(
    breakdown[0].score * 0.22 +
      breakdown[1].score * 0.24 +
      breakdown[2].score * 0.22 +
      breakdown[3].score * 0.18 +
      breakdown[4].score * 0.14,
  );
  const scoreLabel =
    score >= 85 ? "File with minor notes" : score >= 70 ? "Usable, with exceptions" : score >= 55 ? "Review before submission" : "Hold — material gaps";

  const limitations: string[] = [];
  if (!bill) limitations.push("No document was classified as a hospital bill, so no charge ledger was built.");
  if (!policy) limitations.push("The policy schedule is not on file. Room cap, proportionate deduction, and co-pay were not applied.");
  if (!discharge && bill) limitations.push("Without a discharge summary, date and drain contradictions rest on the bill and whatever else is present.");
  if (!operative && bill) limitations.push("Operative notes are missing, so the glove count is not confirmed against the OT record.");
  if (unclassified.length > 0) limitations.push("Unclassified files were skipped. Set a document type and re-analyze.");
  if (bills.length > 1) limitations.push("Only the first hospital bill was parsed.");

  const narrative = writeNarrative({ patient, totals, policy, bill: Boolean(bill), reviewTotal });

  const insuranceNarrative = !bill
    ? "There is no hospital bill to price."
    : policy
      ? `${FACTS.productName} (${FACTS.policyNumber}) caps a private room at ${formatINR(FACTS.roomCap)} and applies proportionate deduction, then a ${Math.round(FACTS.coPayRate * 100)}% co-pay. Insurer position ${formatINR(insurerApproved)}. Patient share ${formatINR(patientShare)}. Still open ${formatINR(reviewTotal)}.`
      : `Non-payable and duplicate lines can be refused without the schedule (${formatINR(deniedTotal)}). Everything else, ${formatINR(reviewTotal)}, waits on the policy.`;

  const results: CaseResults = {
    caseId,
    analysisVersion: version,
    generatedAt: new Date().toISOString(),
    patient,
    totals,
    score,
    scoreLabel,
    narrative,
    breakdown,
    lineItems: priced.map((row) => row.line),
    documentIds: documents.map((doc) => doc.id),
    limitations,
  };

  const insurance: InsuranceAssessment = {
    caseId,
    analysisVersion: version,
    policyOnFile: policy,
    payer: policy || patient.payer ? FACTS.payer : null,
    productName: policy ? FACTS.productName : null,
    policyNumber: policy ? FACTS.policyNumber : null,
    sumInsured: policy ? FACTS.sumInsured : null,
    roomRentCapPerDay: policy ? FACTS.roomCap : null,
    coPayRate: policy ? FACTS.coPayRate : null,
    proportionateDeduction: policy,
    narrative: insuranceNarrative,
    rows,
    denials,
    payableTotal: insurerApproved,
    deniedTotal,
    reviewTotal,
  };

  const events = buildEvents(documents, results, findings);

  return {
    results,
    findings,
    insurance,
    evidence,
    events,
    patientName: patient.name,
    facility: patient.facility,
    suggestedTitle: patient.name && patient.facility ? `${patient.name} · ${patient.facility}` : patient.name || "Untitled case",
  };
}

function writeNarrative(input: {
  patient: PatientFace;
  totals: BillTotals;
  policy: boolean;
  bill: boolean;
  reviewTotal: number;
}) {
  if (!input.bill || !input.patient.name) {
    return "The case does not yet contain a readable hospital bill. Upload the final account, or set the document type on a file that is the bill, then re-analyze.";
  }
  const who = `${input.patient.name}'s bill at ${input.patient.facility ?? "the hospital"} is ${formatINR(input.totals.billed)}`;
  const stay =
    input.patient.procedure && input.patient.admissionAt
      ? ` for a ${input.patient.procedure.toLowerCase()}, admitted ${formatDay(input.patient.admissionAt)} and discharged ${formatDay(input.patient.dischargeAt ?? input.patient.admissionAt)}.`
      : ".";
  if (!input.policy) {
    return `${who}${stay} ${formatINR(input.totals.patientShare)} can already be treated as non-payable or duplicated. ${formatINR(input.reviewTotal)} cannot be priced until the policy schedule is added.`;
  }
  return `${who}${stay} On the schedule now in the file, ${formatINR(input.totals.insurerApproved)} is the insurer position after the room cap, proportionate deduction, and co-pay. ${formatINR(input.totals.patientShare)} falls to the patient on those terms. ${formatINR(input.reviewTotal)} should be held until the open lines are matched to the record.`;
}

function buildDenials(input: {
  caseId: string;
  policy: boolean;
  priced: Priced[];
  findings: Finding[];
  totals: BillTotals;
  documents: DocumentRecord[];
}): DenialExplanation[] {
  const denials: DenialExplanation[] = [];
  const policyDoc = first(input.documents, "insurance_policy");
  const bill = first(input.documents, "hospital_bill");
  const docs = [bill?.id, policyDoc?.id].filter(Boolean) as string[];
  const finding = (slug: string) => input.findings.find((item) => item.id.endsWith(slug)) ?? null;

  const extra = input.priced.find((row) => row.corpus.rule === "room_extra");
  if (extra && extra.denied > 0) {
    const match = finding("room-extra-day");
    denials.push({
      id: `${input.caseId}-why-room-day`,
      title: "Why isn't the discharge-day room paid?",
      amount: extra.denied,
      explanation: extra.reason,
      clause: extra.clause,
      documentIds: match?.documentIds ?? docs,
      confidence: match?.confidence ?? 0.8,
      findingId: match?.id ?? null,
    });
  }

  if (input.policy) {
    const roomExcess = input.priced.filter((row) => row.corpus.rule === "room_night").reduce((sum, row) => sum + row.denied, 0);
    if (roomExcess > 0) {
      const match = finding("room-cap");
      denials.push({
        id: `${input.caseId}-why-room-cap`,
        title: "Why isn't the deluxe room paid in full?",
        amount: roomExcess,
        explanation: `The schedule admits ${formatINR(FACTS.roomCap)} a day. The hospital billed ${formatINR(FACTS.roomRate)}. The difference on the four nights of the stay is ${formatINR(roomExcess)}.`,
        clause: "Schedule cl. 4.2 — room rent sub-limit",
        documentIds: docs,
        confidence: 0.92,
        findingId: match?.id ?? null,
      });
    }
    const prop = input.priced.filter((row) => row.corpus.rule === "proportionate").reduce((sum, row) => sum + row.denied, 0);
    if (prop > 0) {
      denials.push({
        id: `${input.caseId}-why-proportionate`,
        title: "Why were the surgeon and the theatre cut?",
        amount: prop,
        explanation: `They were not found unnecessary. The room the patient took is above the cap, so clause 4.3 pays associated charges at ${FACTS.roomCap} ÷ ${FACTS.roomRate}. That is ${formatINR(prop)} less than the bill.`,
        clause: "Schedule cl. 4.3 — proportionate deduction",
        documentIds: docs,
        confidence: 0.9,
        findingId: finding("proportionate")?.id ?? null,
      });
    }
    if (input.totals.coPay > 0) {
      denials.push({
        id: `${input.caseId}-why-copay`,
        title: "Why is there still a co-pay after all of that?",
        amount: input.totals.coPay,
        explanation: `Gold Assure on this schedule carries a ${Math.round(FACTS.coPayRate * 100)}% voluntary co-pay. It applies to the admissible amount after caps and proportionate deduction, which is ${formatINR(input.totals.admissible)}. The co-pay is ${formatINR(input.totals.coPay)}.`,
        clause: "Schedule cl. 6.1 — co-pay",
        documentIds: policyDoc ? [policyDoc.id] : docs,
        confidence: 0.95,
        findingId: null,
      });
    }
  } else if (bill) {
    denials.push({
      id: `${input.caseId}-why-no-policy`,
      title: "Why can't the rest be marked payable?",
      amount: input.totals.underReview,
      explanation: "The policy schedule is not in the case. Room cap, proportionate deduction, sub-limits, and co-pay are unknown, so those lines stay open rather than being waved through.",
      clause: null,
      documentIds: bill ? [bill.id] : [],
      confidence: 0.97,
      findingId: finding("missing-insurance_policy")?.id ?? null,
    });
  }

  const nonPay = input.priced.filter((row) => row.corpus.rule === "non_payable").reduce((sum, row) => sum + row.denied, 0);
  if (nonPay > 0) {
    denials.push({
      id: `${input.caseId}-why-nonpayable`,
      title: "Why aren't the gloves, kit, and paperwork paid?",
      amount: nonPay,
      explanation: "They are on the standard non-payable list: gloves, admission kit, toiletries, attendant diet, documentation, registration, and luxury tax. A schedule is not required to refuse them.",
      clause: "IRDAI non-payable list, Annexure I",
      documentIds: docs,
      confidence: 0.9,
      findingId: finding("non-payable")?.id ?? null,
    });
  }

  const dup = input.priced.filter((row) => row.duplicate).reduce((sum, row) => sum + row.denied, 0);
  if (dup > 0) {
    denials.push({
      id: `${input.caseId}-why-duplicate`,
      title: "Why isn't the second pantoprazole paid?",
      amount: dup,
      explanation: "It is the same dose, the same minute, posted again. The first line can still be argued. The repeat cannot.",
      clause: "Billing integrity — duplicate line",
      documentIds: bill ? [bill.id] : [],
      confidence: 0.93,
      findingId: finding("dup-pantoprazole")?.id ?? null,
    });
  }

  const review = input.priced.filter((row) => row.status === "review").reduce((sum, row) => sum + row.review, 0);
  if (review > 0) {
    denials.push({
      id: `${input.caseId}-why-review`,
      title: "Why are some lines still open?",
      amount: review,
      explanation: "MRCP, the drain, extra IV doses, extra blood counts, and the discharge medicines on the cash receipt are not refused outright. They are not payable until the record agrees with the bill.",
      clause: null,
      documentIds: docs,
      confidence: 0.7,
      findingId: null,
    });
  }

  return denials;
}

function buildEvents(
  documents: DocumentRecord[],
  results: CaseResults,
  findings: Finding[],
): Array<Omit<PipelineEvent, "id">> {
  const events: Array<Omit<PipelineEvent, "id">> = [];
  const push = (stage: PipelineEvent["stage"], message: string, tone: PipelineEvent["tone"] = "neutral", documentId?: string) => {
    events.push({ stage, message, tone, documentId });
  };

  push("upload", `Accepted ${documents.length} document${documents.length === 1 ? "" : "s"} into the case.`);
  for (const doc of documents) {
    push("upload", `${doc.filename} · ${doc.pageCount} page${doc.pageCount === 1 ? "" : "s"}`, "neutral", doc.id);
  }

  for (const doc of documents) {
    push("extract", `Reading ${doc.filename}`, "neutral", doc.id);
    push(
      "extract",
      doc.type === "other"
        ? `${doc.filename} could not be classified`
        : `${doc.filename} classified as ${DOCUMENT_TYPE_LABEL[doc.type]}`,
      doc.type === "other" ? "attention" : "neutral",
      doc.id,
    );
  }

  if (results.lineItems.length > 0 && results.patient.name) {
    push("understand", `Face sheet: ${results.patient.name}${results.patient.facility ? ` · ${results.patient.facility}` : ""}`);
    push("understand", `Parsed ${results.lineItems.length} charge lines · ${formatINR(results.totals.billed)}`);
  } else {
    push("understand", "No hospital bill classified — ledger not built", "attention");
  }

  const cross = findings.filter((finding) =>
    ["duplicate", "quantity_anomaly", "contradiction"].includes(finding.type),
  );
  if (cross.length === 0) {
    push("cross_check", "No duplicate, quantity anomaly, or contradiction from the documents on file.", "clear");
  } else {
    for (const finding of cross.slice(0, 6)) {
      push("cross_check", finding.title, "attention");
    }
  }

  const missing = findings.filter((finding) => finding.type === "missing_document" && finding.severity !== "info");
  if (missing.length > 0) {
    push("cross_check", `${missing.length} expected document${missing.length === 1 ? "" : "s"} still absent`, "attention");
  }

  push("audit", `Bill intelligence ${results.score ?? "—"} · ${results.scoreLabel}`, results.score != null && results.score >= 70 ? "clear" : "attention");

  if (results.totals.billed === 0) {
    push("insurance", "Nothing to price.", "attention");
  } else if (results.patient.policyNumber) {
    push(
      "insurance",
      `Insurer position ${formatINR(results.totals.insurerApproved)} · patient share ${formatINR(results.totals.patientShare)}`,
      "neutral",
    );
  } else {
    push("insurance", "Schedule not on file — only non-payables and duplicates were refused", "attention");
  }

  const excerptCount = findings.length;
  push("evidence", `Linked findings to source pages · ${excerptCount} finding${excerptCount === 1 ? "" : "s"}`, "neutral");
  push("evidence", "Audit is ready.", "clear");

  return events.map((event) => ({ ...event, stage: event.stage }));
}

export function projectStages(events: Array<Omit<PipelineEvent, "id">>, revealed: number, done: boolean) {
  const last = events[Math.max(0, revealed - 1)];
  const activeIndex = last ? STAGE_ORDER.findIndex((stage) => stage.id === last.stage) : 0;
  return STAGE_ORDER.map((stage, index) => ({
    ...stage,
    state: done || index < activeIndex ? "complete" as const : index === activeIndex ? "active" as const : "pending" as const,
  }));
}

export function citationsFrom(
  findingId: string | null,
  evidence: Record<string, EvidenceBundle>,
  limit = 2,
): Citation[] {
  if (!findingId) return [];
  const bundle = evidence[findingId];
  if (!bundle) return [];
  return bundle.excerpts.slice(0, limit).map((excerpt) => ({
    documentId: excerpt.documentId,
    documentName: excerpt.documentName,
    page: excerpt.page,
    excerpt: excerpt.text,
    findingId,
  }));
}
