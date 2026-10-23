import type { DocumentRecord, Finding } from "@/lib/types/domain";
import { formatINR } from "@/lib/utils/format";
import { DOCUMENT_TYPE_LABEL, FINDING_TYPE_LABEL, SEVERITY_LABEL } from "@/lib/utils/labels";
import { ConfidenceBadge } from "@/components/findings/ConfidenceBadge";

const TONE: Record<Finding["severity"], string> = {
  critical: "bg-clay",
  high: "bg-brass",
  medium: "bg-steel",
  low: "bg-foreground/40",
  info: "bg-foreground/25",
};

export function FindingCard({
  finding,
  documents,
  active = false,
  onOpen,
}: {
  finding: Finding;
  documents: DocumentRecord[];
  active?: boolean;
  onOpen: (findingId: string) => void;
}) {
  const names = finding.documentIds
    .map((id) => documents.find((document) => document.id === id))
    .filter((document): document is DocumentRecord => Boolean(document));

  return (
    <article
      className={`panel relative overflow-hidden ${active ? "ring-1 ring-foreground/40" : ""}`}
    >
      <span className={`absolute inset-y-0 left-0 w-0.5 ${TONE[finding.severity]}`} aria-hidden />
      <div className="px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="kicker">{finding.typeLabel ?? FINDING_TYPE_LABEL[finding.type]}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{SEVERITY_LABEL[finding.severity]}</span>
          {finding.confidence != null ? <ConfidenceBadge value={finding.confidence} className="ml-auto" /> : null}
        </div>
        <h3 className="mt-2 text-base leading-snug text-foreground">{finding.title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{finding.summary}</p>
        {finding.evidenceNotes && finding.evidenceNotes.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {finding.evidenceNotes.map((note, index) => (
              <li key={`${note.document}-${note.page}-${index}`} className="rounded-lg border border-border bg-black/20 px-3 py-2">
                <p className="font-mono text-[11px] text-foreground">
                  {note.document}
                  <span className="text-muted-foreground"> · p.{note.page}</span>
                </p>
                {note.reason ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{note.reason}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {finding.impactAmount != null ? (
            <span className="font-mono text-sm text-foreground">{formatINR(finding.impactAmount)} exposure</span>
          ) : (
            <span className="text-xs text-muted-foreground">No separate rupee exposure</span>
          )}
          {names.map((document) => (
            <span key={document.id} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              {DOCUMENT_TYPE_LABEL[document.type]}
            </span>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onOpen(finding.id)}
            className="inline-flex h-8 items-center rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-pressed={active}
          >
            View evidence
          </button>
          <p className="text-xs leading-5 text-muted-foreground">{finding.recommendation}</p>
        </div>
      </div>
    </article>
  );
}
