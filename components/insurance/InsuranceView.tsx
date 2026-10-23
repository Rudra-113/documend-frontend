import type { InsuranceAssessment, LiveLedgerFigures } from "@/lib/types/domain";
import { formatINR, formatINROrDash, formatPercent } from "@/lib/utils/format";
import { CoverageRow } from "@/components/insurance/CoverageRow";
import { MetricCard } from "@/components/dashboard/MetricCard";

function ledgerHeading(ledger: LiveLedgerFigures) {
  if (ledger.status === "estimated") return "Estimated from the documents";
  if (ledger.status === "insufficient_documents") return "Bill or policy missing";
  if (ledger.status === "needs_review") return "Needs review";
  return "Insurance";
}

export function InsuranceView({
  insurance,
  onOpenFinding,
}: {
  insurance: InsuranceAssessment;
  onOpenFinding: (findingId: string) => void;
}) {
  if (insurance.ledger) {
    const ledger = insurance.ledger;
    const estimated = ledger.status === "estimated";
    return (
      <div className="space-y-6">
        <div>
          <p className="kicker">Insurance checker</p>
          <h2 className="mt-1 font-serif text-3xl">{ledgerHeading(ledger)}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{insurance.narrative}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Bill total" value={formatINROrDash(estimated ? ledger.billTotal : null)} hint={estimated ? "Returned bill total" : "Not estimated"} />
          <MetricCard label="Copay" value={formatPercent(estimated ? ledger.copayPercent : null)} hint={estimated ? "Returned copay" : "Not estimated"} />
          <MetricCard
            label="Estimated insurance share"
            value={formatINROrDash(estimated ? ledger.insuranceShare : null)}
            hint={estimated ? "Returned by the ledger" : "Waiting on the required documents"}
            tone="sage"
          />
          <MetricCard
            label="Estimated patient share"
            value={formatINROrDash(estimated ? ledger.patientShare : null)}
            hint={estimated ? "Returned by the ledger" : "Waiting on the required documents"}
            tone="brass"
          />
        </div>
        <section className="panel p-5">
          <p className="kicker">{ledger.status === "estimated" ? "Disclaimer" : "What the ledger returned"}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {ledger.disclaimer ?? ledger.message ?? insurance.narrative}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Insurance checker</p>
          <h2 className="mt-1 font-serif text-3xl">{insurance.payer ?? "No payer on file"}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{insurance.narrative}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Product" value={insurance.productName ?? "—"} hint={insurance.policyNumber ?? "Schedule not uploaded"} />
        <MetricCard
          label="Sum insured"
          value={insurance.sumInsured != null ? formatINR(insurance.sumInsured) : "—"}
          hint={insurance.roomRentCapPerDay != null ? `Room cap ${formatINR(insurance.roomRentCapPerDay)} / day` : "Cap unknown"}
        />
        <MetricCard
          label="Co-pay"
          value={insurance.coPayRate != null ? `${Math.round(insurance.coPayRate * 100)}%` : "—"}
          hint={insurance.proportionateDeduction ? "Proportionate deduction applies" : "Not applied"}
        />
        <MetricCard label="Insurer position" value={formatINR(insurance.payableTotal)} hint={`${formatINR(insurance.reviewTotal)} still open`} tone="sage" />
      </div>

      <section className="panel p-5">
        <p className="kicker">Why isn’t insurance paying this?</p>
        <div className="mt-4 divide-y divide-border">
          {insurance.denials.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing has been refused or held.</p>
          ) : (
            insurance.denials.map((denial) => (
              <article key={denial.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="text-base">{denial.title}</h3>
                  <p className="font-mono text-sm">{formatINR(denial.amount)}</p>
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{denial.explanation}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {denial.clause ? <p className="font-mono text-[10px] text-brass">{denial.clause}</p> : null}
                  {denial.findingId ? (
                    <button
                      type="button"
                      onClick={() => onOpenFinding(denial.findingId!)}
                      className="text-xs text-foreground underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      View evidence
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel px-5 py-2">
        <div className="hidden border-b border-border py-3 text-[11px] tracking-wide text-muted-foreground uppercase md:grid md:grid-cols-[minmax(0,1.5fr)_repeat(3,90px)_110px]">
          <span>Line</span>
          <span>Billed</span>
          <span>Allowed</span>
          <span>Not paid</span>
          <span>Status</span>
        </div>
        {insurance.rows.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No charge lines to compare with a policy.</p>
        ) : (
          insurance.rows.map((row) => <CoverageRow key={row.id} row={row} />)
        )}
      </section>
    </div>
  );
}
