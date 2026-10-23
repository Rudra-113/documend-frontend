"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { PIPELINE } from "@/components/landing/landing-copy";

export function PinnedMethod() {
  const reduce = useReducedMotion();
  if (reduce) return <StaticMethod />;
  return <ScrubMethod />;
}

function StaticMethod() {
  return (
    <section id="method" className="scroll-mt-24 px-4 py-20 md:px-6">
      <div className="mx-auto max-w-6xl">
        <p className="kicker">Method</p>
        <h2 className="mt-3 max-w-xl font-serif text-4xl md:text-6xl">Seven passes. One file.</h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-2">
          {PIPELINE.map((stage) => (
            <li key={stage.id} className="panel p-5">
              <p className="font-mono text-[11px] text-brass">
                {stage.index} · {stage.label}
              </p>
              <h3 className="mt-3 font-serif text-2xl">{stage.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{stage.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ScrubMethod() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [index, setIndex] = useState(0);
  const bar = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const next = Math.min(PIPELINE.length - 1, Math.floor(value * PIPELINE.length * 0.999));
    setIndex((current) => (current === next ? current : next));
  });

  const stage = PIPELINE[index];

  return (
    <section id="method" ref={ref} className="relative h-[320vh] scroll-mt-24">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden px-4 md:px-6">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <p className="kicker">Method</p>
            <p className="mt-6 font-mono text-sm text-brass">
              {stage.index}
              <span className="text-muted-foreground"> / 07</span>
            </p>
            <div className="mt-3 h-px w-40 overflow-hidden bg-border">
              <motion.div className="h-full bg-brass" style={{ width: bar }} />
            </div>
            <div key={stage.id} className="ledger-fade">
              <h2 className="mt-5 font-serif text-4xl leading-[1.05] md:text-6xl">{stage.title}</h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">{stage.body}</p>
            </div>
            <ol className="mt-8 flex flex-wrap gap-2" aria-label="Pipeline stages">
              {PIPELINE.map((item, itemIndex) => (
                <li key={item.id}>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-wide uppercase ${
                      itemIndex === index ? "border-brass text-brass" : itemIndex < index ? "border-foreground/30 text-foreground" : "border-border text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <StagePlate index={index} />
        </div>
      </div>
    </section>
  );
}

function StagePlate({ index }: { index: number }) {
  return (
    <div className="panel relative min-h-[420px] overflow-hidden p-6 md:p-8" aria-hidden>
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(to right, color-mix(in oklab, var(--foreground) 7%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 7%, transparent) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      <div key={index} className="ledger-fade relative">
        <Plate index={index} />
      </div>
    </div>
  );
}

function Plate({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="grid gap-3">
        <p className="kicker">Incoming</p>
        {["Final bill · 6 pages", "Policy schedule · 4 pages", "Discharge summary · 3 pages", "Ultrasound report · 2 pages"].map((file, i) => (
          <div key={file} className="ledger-fade flex items-center justify-between rounded-xl border border-border bg-black/30 px-4 py-3 text-sm" style={{ animationDelay: `${i * 0.06}s` }}>
            <span>{file}</span>
            <span className="font-mono text-[10px] text-sage">accepted</span>
          </div>
        ))}
      </div>
    );
  }
  if (index === 1) {
    return (
      <div>
        <p className="kicker">Classification</p>
        <div className="mt-6 space-y-4 font-mono text-xs leading-6 text-muted-foreground">
          <p>page 1 · header · admission 12 Oct 14:20</p>
          <p className="text-foreground">page 2 · room line · deluxe single · ₹12,500</p>
          <p>page 4 · pharmacy · pantoprazole · posted twice</p>
          <p>page 6 · receipt · cash collected at discharge</p>
        </div>
      </div>
    );
  }
  if (index === 2) {
    return (
      <div>
        <p className="kicker">Face sheet</p>
        <p className="mt-4 font-serif text-4xl">Ananya Krishnan</p>
        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          {[
            ["Stay", "4 nights"],
            ["Room", "Deluxe single"],
            ["Procedure", "Lap. cholecystectomy"],
            ["Payer", "Northstar Gold"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="kicker">{label}</dt>
              <dd className="mt-1">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }
  if (index === 3) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-border bg-black/25 p-4">
          <p className="kicker">Bill</p>
          <p className="mt-3 text-sm leading-6">16 Oct · deluxe single · ₹12,500</p>
        </article>
        <article className="rounded-xl border border-clay/50 bg-clay/10 p-4">
          <p className="kicker">Discharge</p>
          <p className="mt-3 text-sm leading-6">Room vacated 11:40 on 16 Oct. No overnight stay.</p>
        </article>
        <p className="font-serif text-2xl text-brass md:col-span-2">The pages disagree.</p>
      </div>
    );
  }
  if (index === 4) {
    return (
      <div className="flex items-center gap-6">
        <ScoreRing value={60} />
        <div>
          <p className="kicker">Bill intelligence</p>
          <p className="mt-2 font-serif text-5xl">60</p>
          <p className="mt-2 text-sm text-muted-foreground">Review before submission</p>
        </div>
      </div>
    );
  }
  if (index === 5) {
    return (
      <div>
        <p className="kicker">Why this line is unpaid</p>
        <ul className="mt-5 space-y-3 text-sm">
          {[
            ["Room above cap", "₹18,000"],
            ["Non-payables", "₹15,655"],
            ["Duplicate pantoprazole", "₹920"],
          ].map(([label, amount]) => (
            <li key={label} className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
              <span>{label}</span>
              <span className="font-mono text-brass">{amount}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div>
      <p className="kicker">Pinned excerpt</p>
      <blockquote className="mt-5 border-l border-brass pl-4 text-sm leading-7">
        Patient discharged in stable condition at 11:40 on 16 October 2026. <mark className="bg-brass/25 text-foreground">Room vacated at discharge.</mark> No overnight stay on the 16th.
      </blockquote>
      <p className="mt-4 font-mono text-[11px] text-muted-foreground">Discharge-summary-Krishnan.pdf · p. 2</p>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const radius = 46;
  const c = 2 * Math.PI * radius;
  const offset = c - (value / 100) * c;
  return (
    <svg viewBox="0 0 120 120" className="size-28 shrink-0" aria-hidden>
      <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" className="text-border" strokeWidth="6" />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="currentColor"
        className="text-brass"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 60 60)"
      />
    </svg>
  );
}
