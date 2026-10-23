import type { CaseResults, Finding } from "@/lib/types/domain";
import { formatDay, formatINR, formatINROrDash, formatPercent, formatStamp } from "@/lib/utils/format";
import { MetricCard } from "@/components/dashboard/MetricCard";

function FaceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border py-2.5">
      <dt className="kicker">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function IntelligenceView({
  results,
  findings,
  onOpenFinding,
}: {
  results: CaseResults;
  findings: Finding[];
  onOpenFinding: (findingId: string) => void;
}) {
  const face = results.patient;
  const ledger = results.ledger;
  const estimated = ledger?.status === "estimated";
  const missing = findings.filter((finding) => finding.type === "missing_document" && finding.severity !== "info").length;
  const flagged = results.lineItems.filter((line) => line.findingIds.length > 0).length;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="panel p-5 lg:col-span-4 lg:col-start-9 lg:row-start-1">
        <p className="kicker">Bill intelligence</p>
        <div className="mt-3 flex items-end gap-4">
          <ScoreRing score={results.score} />
          <div>
            <p className="font-serif text-5xl leading-none">{results.score ?? "—"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{results.scoreLabel}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6">{results.narrative}</p>
        <ul className="mt-5 space-y-3">
          {results.breakdown.map((item) => (
            <li key={item.key}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span>{item.label}</span>
                <span className="font-mono">{item.score}</span>
              </div>
              <div className="mt-1.5 h-px bg-border" aria-hidden>
                <div className="h-px bg-foreground" style={{ width: `${item.score}%` }} />
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="space-y-6 lg:col-span-8 lg:col-start-1 lg:row-start-1">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ledger ? (
            <>
              <MetricCard label="Bill total" value={formatINROrDash(estimated ? ledger.billTotal : null)} hint={`${ledger.documentCount} document${ledger.documentCount === 1 ? "" : "s"} on this case`} />
              <MetricCard label="Copay" value={formatPercent(estimated ? ledger.copayPercent : null)} hint={ledger.status === "estimated" ? "Returned copay" : "Not estimated"} />
              <MetricCard label="Estimated insurance share" value={formatINROrDash(estimated ? ledger.insuranceShare : null)} tone="sage" />
              <MetricCard label="Estimated patient share" value={formatINROrDash(estimated ? ledger.patientShare : null)} tone="brass" />
            </>
          ) : (
            <>
              <MetricCard label="Billed" value={formatINR(results.totals.billed)} hint="Sum of extracted charge lines" />
              <MetricCard
                label="Insurer position"
                value={formatINR(results.totals.insurerApproved)}
                hint={results.totals.coPay > 0 ? `After ${formatINR(results.totals.coPay)} co-pay` : "Schedule not applied"}
                tone="sage"
              />
              <MetricCard label="Patient share" value={formatINR(results.totals.patientShare)} hint="Refused lines plus co-pay" tone="brass" />
              <MetricCard label="Under review" value={formatINR(results.totals.underReview)} hint={`${missing} expected records still out`} tone="clay" />
            </>
          )}
        </section>

        <section className="panel p-5">
          <p className="kicker">Face sheet</p>
          <h2 className="mt-2 font-serif text-3xl leading-tight">{face.name ?? "Patient not established"}</h2>
          <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
            <FaceRow label="Facility" value={face.facility ? `${face.facility}${face.facilityCity ? `, ${face.facilityCity}` : ""}` : "—"} />
            <FaceRow label="UHID" value={face.uhid ?? "—"} />
            <FaceRow label="Admission" value={face.admissionAt ? formatStamp(face.admissionAt) : "—"} />
            <FaceRow label="Discharge" value={face.dischargeAt ? formatStamp(face.dischargeAt) : "—"} />
            <FaceRow label="Stay" value={face.lengthOfStayNights != null ? `${face.lengthOfStayNights} nights` : "—"} />
            <FaceRow label="Room" value={face.roomCategory ?? "—"} />
            <FaceRow label="Diagnosis" value={face.diagnosis ?? "—"} />
            <FaceRow label="Procedure" value={face.procedure ?? "—"} />
            <FaceRow label="Physician" value={face.physician ?? "—"} />
            <FaceRow label="Payer" value={face.payer ? `${face.payer}${face.productName ? ` · ${face.productName}` : ""}` : "—"} />
            <FaceRow label="Policy" value={face.policyNumber ?? "Not on file"} />
            <FaceRow label="TPA" value={face.tpa ?? "—"} />
          </dl>
        </section>

        <section className="panel overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5">
            <div>
              <p className="kicker">Charge ledger</p>
              <h2 className="mt-1 text-lg">
                {results.lineItems.length === 0 ? "No lines extracted" : `${results.lineItems.length} lines · ${flagged} flagged`}
              </h2>
            </div>
            <p className="max-w-sm text-xs leading-5 text-muted-foreground">
              Exposure on a finding can overlap another. Do not add the flags into a second bill.
            </p>
          </div>
          {results.lineItems.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">No charge lines were returned for this analysis.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <caption className="sr-only">Itemized hospital charges and the findings attached to each line</caption>
                <thead className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  <tr className="border-y border-border">
                    <th scope="col" className="px-5 py-2 font-medium">Date</th>
                    <th scope="col" className="px-3 py-2 font-medium">Code</th>
                    <th scope="col" className="px-3 py-2 font-medium">Description</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Qty</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Amount</th>
                    <th scope="col" className="px-5 py-2 font-medium">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {results.lineItems.map((line) => {
                    const linked = findings.filter((finding) => line.findingIds.includes(finding.id));
                    return (
                      <tr key={line.id} className="border-b border-border/80 align-top">
                        <td className="px-5 py-3 font-mono text-xs whitespace-nowrap">{formatDay(line.serviceDate)}</td>
                        <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{line.code}</td>
                        <td className="px-3 py-3">
                          {line.description}
                          <span className="mt-0.5 block text-xs text-muted-foreground">{line.category}</span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-xs">
                          {line.quantity} {line.unit}
                        </td>
                        <td className="px-3 py-3 text-right font-mono">{formatINR(line.amount)}</td>
                        <td className="px-5 py-3">
                          {linked.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Clear</span>
                          ) : (
                            <div className="flex flex-col items-start gap-1">
                              {linked.slice(0, 2).map((finding) => (
                                <button
                                  key={finding.id}
                                  type="button"
                                  onClick={() => onOpenFinding(finding.id)}
                                  className="text-left text-xs text-brass underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                >
                                  {finding.title}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {results.limitations.length > 0 ? (
          <section className="px-1">
            <p className="kicker">Limits of this audit</p>
            <ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
              {results.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number | null }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = score == null ? circumference : circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const tone = score == null ? "var(--border)" : score >= 70 ? "var(--sage)" : score >= 55 ? "var(--brass)" : "var(--clay)";
  return (
    <svg viewBox="0 0 88 88" className="size-20 shrink-0" aria-hidden>
      <circle cx="44" cy="44" r={radius} fill="none" stroke="var(--border)" strokeWidth="5" />
      <circle
        cx="44"
        cy="44"
        r={radius}
        fill="none"
        stroke={tone}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 44 44)"
      />
    </svg>
  );
}
