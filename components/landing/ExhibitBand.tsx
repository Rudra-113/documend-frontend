"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { SPECIMEN } from "@/components/landing/landing-copy";
import { formatINR } from "@/lib/utils/format";

const FIGURES = [
  { label: "Billed", value: SPECIMEN.billed, money: true },
  { label: "Insurer position", value: SPECIMEN.insurer, money: true },
  { label: "Patient share", value: SPECIMEN.patient, money: true },
  { label: "Under review", value: SPECIMEN.review, money: true },
] as const;

export function ExhibitBand({ onSample, submitting }: { onSample: () => void; submitting: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const reduce = useReducedMotion();
  const play = Boolean(inView);

  return (
    <section id="exhibit" ref={ref} className="scroll-mt-24 px-4 py-24 md:px-6">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <p className="kicker">Exhibit · Meridian sample</p>
          <h2 className="mt-3 font-serif text-4xl leading-[1.02] md:text-6xl">A discharge morning still sitting on the bill.</h2>
          <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">
            Four nights at Meridian City Hospital. The policy caps a private room at ₹8,000. The bill posts deluxe at ₹12,500, including the morning the patient left. These figures are the specimen. A case you open is computed from the documents on that case.
          </p>
          <button
            type="button"
            onClick={onSample}
            disabled={submitting}
            className="mt-6 inline-flex h-11 items-center rounded-full border border-border px-5 text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          >
            {submitting ? "Opening the case…" : "Run this sample"}
          </button>
        </div>
        <div className="panel p-6 md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="kicker">Bill intelligence</p>
              <p className="mt-2 font-serif text-6xl">{play ? <CountUp to={SPECIMEN.score} run={play} instant={Boolean(reduce)} /> : "00"}</p>
              <p className="mt-1 text-sm text-muted-foreground">Review before submission</p>
            </div>
            <Ring value={play ? SPECIMEN.score : 0} animate={play && !reduce} />
          </div>
          <dl className="mt-8 grid grid-cols-2 gap-4">
            {FIGURES.map((figure) => (
              <div key={figure.label} className="border-t border-border pt-3">
                <dt className="kicker">{figure.label}</dt>
                <dd className="mt-2 font-mono text-lg">
                  {play ? (
                    <CountUp to={figure.value} run={play} instant={Boolean(reduce)} money={figure.money} />
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 font-mono text-[11px] text-muted-foreground">{SPECIMEN.findings} findings on the specimen · operative notes absent</p>
        </div>
      </div>
    </section>
  );
}

function CountUp({ to, run, instant, money = false }: { to: number; run: boolean; instant: boolean; money?: boolean }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (instant) {
      const frame = requestAnimationFrame(() => setValue(to));
      return () => cancelAnimationFrame(frame);
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1200);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(to * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [instant, run, to]);
  return money ? formatINR(value) : String(value);
}

function Ring({ value, animate }: { value: number; animate: boolean }) {
  const radius = 42;
  const c = 2 * Math.PI * radius;
  const offset = c - (value / 100) * c;
  return (
    <svg viewBox="0 0 110 110" className="size-28" aria-hidden>
      <circle cx="55" cy="55" r={radius} fill="none" className="stroke-border" strokeWidth="6" />
      <circle
        cx="55"
        cy="55"
        r={radius}
        fill="none"
        className="stroke-brass"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 55 55)"
        style={{ transition: animate ? "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)" : undefined }}
      />
    </svg>
  );
}
