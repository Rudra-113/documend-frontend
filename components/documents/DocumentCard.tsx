import type { DocumentRecord, DocumentType } from "@/lib/types/domain";
import { formatBytes, formatConfidence } from "@/lib/utils/format";
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABEL } from "@/lib/utils/labels";

export function DocumentCard({
  document,
  pending = false,
  disabled = false,
  onTypeChange,
  onRemove,
}: {
  document: DocumentRecord;
  pending?: boolean;
  disabled?: boolean;
  onTypeChange: (documentId: string, type: DocumentType) => void;
  onRemove: (documentId: string) => void;
}) {
  return (
    <article className="panel flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="kicker">{DOCUMENT_TYPE_LABEL[document.type]}</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] ${pending ? "bg-brass/15 text-brass" : "bg-sage/15 text-sage"}`}>
          {pending ? "Not in this audit" : document.analysisVersion ? `In v${document.analysisVersion}` : "Queued"}
        </span>
      </div>
      <h3 className="mt-3 truncate text-sm" title={document.filename}>
        {document.filename}
      </h3>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
        {document.pageCount} page{document.pageCount === 1 ? "" : "s"} · {formatBytes(document.sizeBytes)} ·{" "}
        {formatConfidence(document.classificationConfidence)} match
      </p>
      <label className="mt-4 block text-xs text-muted-foreground">
        Document type
        <select
          value={document.type}
          disabled={disabled}
          aria-label={`Document type for ${document.filename}`}
          onChange={(event) => onTypeChange(document.id, event.target.value as DocumentType)}
          className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
        >
          {DOCUMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {DOCUMENT_TYPE_LABEL[type]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => onRemove(document.id)}
        disabled={disabled}
        className="mt-3 self-start text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40"
      >
        Remove from case
      </button>
    </article>
  );
}
