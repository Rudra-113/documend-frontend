import { citationsFrom, type AnalysisOutput } from "@/lib/mock/analyze";
import type { ChatMessage, Citation, Finding } from "@/lib/types/domain";

interface Answer {
  text: string;
  citations: Citation[];
  confidence: number;
}

function findingBySlug(findings: Finding[], slug: string) {
  return findings.find((finding) => finding.id.endsWith(slug)) ?? null;
}

export function answerQuestion(question: string, output: AnalysisOutput, stale: boolean): Omit<ChatMessage, "id" | "createdAt" | "role"> {
  const q = question.toLowerCase();
  const { results, findings, insurance, evidence } = output;
  const answer = route(q);
  const prefix = stale
    ? `This reply uses audit v${results.analysisVersion}. Documents have changed since that run.\n\n`
    : "";
  return {
    text: `${prefix}${answer.text}`,
    citations: answer.citations,
    confidence: answer.confidence,
  };

  function cite(slug: string, limit = 2): Citation[] {
    const finding = findingBySlug(findings, slug);
    return citationsFrom(finding?.id ?? null, evidence, limit);
  }

  function route(text: string): Answer {
    const hit = (slug: string, fallback: string, confidence = 0.55): Answer => {
      const finding = findingBySlug(findings, slug);
      if (!finding) {
        return {
          text: fallback,
          citations: [],
          confidence,
        };
      }
      return {
        text: `${finding.summary} ${finding.recommendation}`,
        citations: cite(slug),
        confidence: finding.confidence ?? 0.5,
      };
    };

    if (/glove/.test(text)) {
      return hit("qty-gloves", "No glove-count finding was raised on the current audit.");
    }
    if (/pantoprazole|duplicate|same minute|twice/.test(text) && !/why/.test(text)) {
      return hit("dup-pantoprazole", "No duplicate charge was raised on the current audit.");
    }
    if (/drain/.test(text)) {
      return hit("drain", "No drain finding was raised. Either the line is absent, or the bill was not classified.");
    }
    if (/mrcp|cholangio/.test(text)) {
      return hit("mrcp", "No MRCP finding was raised on the current audit.");
    }
    if (/cbc|blood count|bloods/.test(text)) {
      return hit("qty-cbc", "No blood-count quantity finding was raised on the current audit.");
    }
    if (/ceftriax|antibiotic|cefurox/.test(text)) {
      return hit("qty-ceftriaxone", "No antibiotic duration finding was raised on the current audit.");
    }
    if (/receipt|cash|collected/.test(text)) {
      return hit("receipt-double", "No cash-receipt conflict was raised. Add the pharmacy receipt if the patient paid at the counter.");
    }
    if (/pre-?auth|approval|authoris/.test(text)) {
      return hit("preauth-scope", "No pre-authorization is on file, so the approval was not compared with the bill.");
    }
    if (/missing|operative|what else|not uploaded|absent/.test(text)) {
      const missing = findings.filter((item) => item.type === "missing_document" && item.severity !== "info");
      if (missing.length === 0) {
        return {
          text: "Every expected record for this kind of admission is on file.",
          citations: [],
          confidence: 0.8,
        };
      }
      return {
        text: missing.map((item) => item.title.replace(" is not in the case", "")).join(", ") + ". " + missing[0].recommendation,
        citations: cite(missing[0].id.split("-").slice(1).join("-") || "missing-operative_notes"),
        confidence: 0.9,
      };
    }
    if (/proportionate|surgeon|theatre|theater|an[ae]esthet/.test(text)) {
      return hit(
        "proportionate",
        insurance.policyOnFile
          ? "Proportionate deduction was not applied on this audit."
          : "Proportionate deduction was not applied because the policy schedule is not on file.",
      );
    }
    if (/co-?pay/.test(text)) {
      const denial = insurance.denials.find((item) => item.id.endsWith("why-copay"));
      if (!denial) {
        return {
          text: insurance.policyOnFile
            ? "No co-pay was applied on this audit."
            : "Co-pay cannot be calculated until the policy schedule is in the case.",
          citations: [],
          confidence: 0.8,
        };
      }
      return { text: denial.explanation, citations: [], confidence: denial.confidence };
    }
    if (/room|deluxe/.test(text)) {
      const parts = [findingBySlug(findings, "room-extra-day"), findingBySlug(findings, "room-cap")].filter(Boolean);
      if (parts.length === 0) {
        return {
          text: "No room-rent finding was raised. That usually means the bill is missing or the room lines were not extracted.",
          citations: [],
          confidence: 0.5,
        };
      }
      return {
        text: parts.map((item) => item!.summary).join(" "),
        citations: parts.flatMap((item) => citationsFrom(item!.id, evidence, 1)),
        confidence: Math.max(...parts.map((item) => item!.confidence ?? 0)),
      };
    }
    if (/why|isn.?t|not paying|refus|denied|won.?t pay/.test(text)) {
      if (insurance.denials.length === 0) {
        return {
          text: insurance.narrative,
          citations: [],
          confidence: 0.6,
        };
      }
      return {
        text: insurance.denials
          .map((denial) => `${denial.title} ${denial.explanation}`)
          .join("\n\n"),
        citations: insurance.denials.slice(0, 2).flatMap((denial) => citationsFrom(denial.findingId, evidence, 1)),
        confidence: 0.86,
      };
    }
    if (/score|intelligence/.test(text)) {
      const weakest = [...results.breakdown].sort((a, b) => a.score - b.score)[0];
      return {
        text: `Bill intelligence is ${results.score} — ${results.scoreLabel}. The weak axis is ${weakest.label.toLowerCase()} at ${weakest.score}: ${weakest.note}`,
        citations: [],
        confidence: 0.84,
      };
    }
    if (/total|billed|how much|patient share|insurer|approved/.test(text)) {
      return {
        text: results.narrative,
        citations: cite("non-payable", 1),
        confidence: 0.8,
      };
    }
    if (/non-?payable|glove|toiletr|admission kit/.test(text)) {
      return hit("non-payable", "No non-payable bundle was raised.");
    }

    const top = findings.filter((item) => item.severity === "critical" || item.severity === "high").slice(0, 3);
    const headline = top.length
      ? ` The sharpest issues: ${top.map((item) => item.title.toLowerCase()).join("; ")}.`
      : "";
    return {
      text: `${results.narrative}${headline} Ask about a line, a missing record, or why a particular charge is not being paid.`,
      citations: top.slice(0, 2).flatMap((item) => citationsFrom(item.id, evidence, 1)),
      confidence: 0.72,
    };
  }
}
