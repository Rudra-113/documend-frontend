import type { EvidenceBundle, Finding } from "@/lib/types/domain";
import { FINDING_TYPE_LABEL } from "@/lib/utils/labels";
import { EvidencePanel } from "@/components/evidence/EvidencePanel";

export function EvidenceView({
  findings,
  activeId,
  bundle,
  loading,
  error,
  onOpen,
  onClose,
}: {
  findings: Finding[];
  activeId: string | null;
  bundle: EvidenceBundle | null;
  loading: boolean;
  error: string | null;
  onOpen: (findingId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div>
        <p className="kicker">Evidence locker</p>
        <h2 className="mt-1 font-serif text-3xl">Pages</h2>
        <ul className="mt-4 space-y-1">
          {findings.length === 0 ? <li className="text-sm text-muted-foreground">No findings to source.</li> : null}
          {findings.map((finding) => {
            const selected = finding.id === activeId;
            return (
              <li key={finding.id}>
                <button
                  type="button"
                  onClick={() => onOpen(finding.id)}
                  aria-current={selected ? "true" : undefined}
                  className={`w-full rounded-lg px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    selected ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="block text-[10px] tracking-wide uppercase">{FINDING_TYPE_LABEL[finding.type]}</span>
                  <span className="mt-0.5 block text-sm leading-5">{finding.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <EvidencePanel bundle={bundle} loading={loading && Boolean(activeId)} error={error} onClose={activeId ? onClose : undefined} />
    </div>
  );
}
