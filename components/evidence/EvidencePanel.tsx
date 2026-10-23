import type { EvidenceBundle } from "@/lib/types/domain";
import { DOCUMENT_TYPE_LABEL } from "@/lib/utils/labels";
import { SourceCitation } from "@/components/evidence/SourceCitation";

function Highlighted({ text, highlight }: { text: string; highlight: string }) {
  const index = highlight ? text.toLowerCase().indexOf(highlight.toLowerCase()) : -1;
  if (index < 0 || !highlight) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-brass/25 px-0.5 text-foreground">{text.slice(index, index + highlight.length)}</mark>
      {text.slice(index + highlight.length)}
    </>
  );
}

const RELATION = {
  supports: "The pages support the finding.",
  conflicts: "The pages disagree.",
  absent: "The expected page is not in the case.",
};

export function EvidencePanel({
  bundle,
  loading = false,
  error = null,
  onClose,
}: {
  bundle: EvidenceBundle | null;
  loading?: boolean;
  error?: string | null;
  onClose?: () => void;
}) {
  if (loading) {
    return (
      <section className="panel p-5" aria-busy="true" aria-live="polite">
        <p className="kicker">Evidence</p>
        <p className="mt-3 text-sm text-muted-foreground">Pulling the pages this finding rests on.</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel p-5" role="alert">
        <p className="kicker">Evidence</p>
        <p className="mt-3 text-sm text-clay">{error}</p>
      </section>
    );
  }

  if (!bundle) {
    return (
      <section className="panel p-5">
        <p className="kicker">Evidence</p>
        <h2 className="mt-3 font-serif text-2xl leading-tight">No page open</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Choose a finding. The panel shows the lines it was read from, and the lines that disagree.
        </p>
      </section>
    );
  }

  return (
    <section className="panel p-5" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <p className="kicker">Evidence</p>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Close
          </button>
        ) : null}
      </div>
      <h2 className="mt-3 font-serif text-2xl leading-tight">{bundle.headline}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{bundle.explanation}</p>
      <p className="mt-3 text-xs text-brass">{RELATION[bundle.relation]}</p>
      {bundle.excerpts.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No excerpt was attached. The finding is about a document that is not here.</p>
      ) : (
        <div className={`mt-4 grid gap-3 ${bundle.relation === "conflicts" ? "lg:grid-cols-1" : ""}`}>
          {bundle.excerpts.map((excerpt) => (
            <figure key={excerpt.id} className="rounded-xl border border-border bg-black/25 p-3">
              <figcaption className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-[11px] text-foreground">{excerpt.documentName}</span>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">p.{excerpt.page}</span>
              </figcaption>
              <blockquote className="mt-2 text-sm leading-6 text-foreground/95">
                <Highlighted text={excerpt.text} highlight={excerpt.highlight} />
              </blockquote>
              {excerpt.documentType !== "other" ? (
                <p className="mt-2 text-[11px] text-muted-foreground">{DOCUMENT_TYPE_LABEL[excerpt.documentType]} · {excerpt.section}</p>
              ) : excerpt.section && excerpt.section !== excerpt.documentName ? (
                <p className="mt-2 text-[11px] text-muted-foreground">{excerpt.section}</p>
              ) : null}
            </figure>
          ))}
        </div>
      )}
      <div className="mt-4 space-y-2">
        {bundle.excerpts.map((excerpt) => (
          <SourceCitation
            key={`${excerpt.id}-cite`}
            documentName={excerpt.documentName}
            page={excerpt.page}
            excerpt={excerpt.section}
          />
        ))}
      </div>
    </section>
  );
}
