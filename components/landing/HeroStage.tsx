"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { MARQUEE } from "@/components/landing/landing-copy";

const WORDS = ["Read", "the", "bill."];

const LINES = [
  { code: "RM-DELUXE", name: "Deluxe single room", meta: "16 Oct · 1 day", amount: "₹12,500", flag: "Cap" },
  { code: "SRG-LAP", name: "Surgeon fee, laparoscopic", meta: "13 Oct · 1 procedure", amount: "₹85,000", flag: "" },
  { code: "DRG-PAN", name: "Pantoprazole 40 mg", meta: "14 Oct · 08:14", amount: "₹920", flag: "" },
  { code: "DRG-PAN", name: "Pantoprazole 40 mg", meta: "14 Oct · 08:14", amount: "₹920", flag: "Duplicate" },
  { code: "CON-GLV", name: "Sterile gloves", meta: "Qty 48", amount: "₹6,240", flag: "Quantity" },
];

export function HeroStage() {
  const reduce = useReducedMotion();
  const tilt = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end start"] });
  const yCopy = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const yBill = useTransform(scrollYProgress, [0, 1], [0, 70]);
  const cue = useTransform(scrollYProgress, [0, 0.4], [1, 0]);

  function onMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reduce || event.pointerType !== "mouse") return;
    const node = tilt.current;
    const rect = node?.getBoundingClientRect();
    if (!node || !rect) return;
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    node.style.transform = `rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 9).toFixed(2)}deg)`;
  }

  function onLeave() {
    if (tilt.current) tilt.current.style.transform = "rotateX(0deg) rotateY(0deg)";
  }

  return (
    <section id="hero" ref={section} className="relative flex min-h-[100svh] items-center px-4 pt-24 pb-16 md:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(520px 280px at 18% 20%, color-mix(in oklab, var(--brass) 16%, transparent), transparent 70%), radial-gradient(480px 320px at 88% 8%, color-mix(in oklab, var(--steel) 18%, transparent), transparent 70%)",
        }}
      />
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <motion.div style={reduce ? undefined : { y: yCopy }}>
          <p className="ledger-fade kicker" style={{ animationDelay: "0.05s" }}>
            Forensic bill review
          </p>
          <h1 className="mt-5 max-w-xl font-serif tracking-tight">
            <span className="block overflow-hidden text-6xl leading-[0.92] md:text-8xl">
              {WORDS.map((word, index) => (
                <span key={word} className="ledger-rise inline-block" style={{ animationDelay: `${0.08 * index}s` }}>
                  {word}
                  {index < WORDS.length - 1 ? "\u00A0" : ""}
                </span>
              ))}
            </span>
            <span className="ledger-fade mt-4 block text-4xl leading-tight italic text-foreground/90 md:text-6xl" style={{ animationDelay: "0.28s" }}>
              Then make it defend itself.
            </span>
            <span className="ledger-rule mt-5 block h-px w-36 bg-brass/70" />
          </h1>
          <p className="ledger-fade mt-6 max-w-lg text-base leading-7 text-foreground/80" style={{ animationDelay: "0.42s" }}>
            DocuMend Ledger lines a hospital bill up with the policy, the discharge summary, the prescription, the reports, and the receipts. Duplicates, odd quantities, contradictions, missing records, and unpaid lines stay pinned to the page they came from.
          </p>
          <div className="ledger-fade mt-8 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "0.55s" }}>
            <a
              href="#open"
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm text-primary-foreground hover:bg-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Open a case
            </a>
            <a
              href="#method"
              className="inline-flex h-11 items-center justify-center rounded-full border border-border px-5 text-sm text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Scroll the method
            </a>
          </div>
        </motion.div>

        <motion.div className="relative [perspective:1200px]" style={reduce ? undefined : { y: yBill }} onPointerMove={onMove} onPointerLeave={onLeave}>
          <div
            aria-hidden
            className="ledger-float absolute -top-8 left-8 z-20 hidden rounded-2xl border border-brass/40 bg-background/90 px-3 py-2 text-xs shadow-xl backdrop-blur-md sm:block"
          >
            <p className="font-mono text-[10px] tracking-widest text-brass uppercase">Policy</p>
            <p className="mt-1">Room cap ₹8,000</p>
          </div>
          <div
            aria-hidden
            className="ledger-float-late absolute -right-2 -bottom-8 z-20 hidden rounded-2xl border border-clay/40 bg-background/90 px-3 py-2 text-xs shadow-xl backdrop-blur-md sm:block"
          >
            <p className="font-mono text-[10px] tracking-widest text-clay uppercase">Discharge</p>
            <p className="mt-1">Room vacated 11:40</p>
          </div>
          <div
            ref={tilt}
            className="panel relative overflow-hidden p-5 transition-transform duration-200 ease-out will-change-transform md:p-6"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="kicker">Specimen bill</p>
                <p className="mt-2 font-serif text-2xl">Meridian City Hospital</p>
              </div>
              <p className="font-mono text-[11px] text-muted-foreground">6 pages</p>
            </div>
            <div className="relative mt-5 overflow-hidden">
              <ul className="divide-y divide-border">
                {LINES.map((line) => (
                  <li key={`${line.code}-${line.flag}`} className="grid grid-cols-[1fr_auto] gap-3 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate">{line.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {line.code} · {line.meta}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-mono">{line.amount}</span>
                      {line.flag ? <span className="text-[10px] text-brass">{line.flag}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
              <div aria-hidden className="ledger-scan pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent via-brass/25 to-transparent" />
            </div>
          </div>
        </motion.div>
      </div>
      <motion.a
        href="#method"
        style={reduce ? undefined : { opacity: cue }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[10px] tracking-[0.2em] text-muted-foreground uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring md:flex"
      >
        Scroll
        <span aria-hidden className="ledger-pulse h-8 w-px bg-foreground/40" />
      </motion.a>
    </section>
  );
}

export function DocumentMarquee() {
  const row = [...MARQUEE, ...MARQUEE];
  return (
    <div className="overflow-hidden border-y border-border py-4" aria-hidden>
      <div className="ledger-marquee flex w-max gap-10 pr-10">
        {row.map((item, index) => (
          <span key={`${item}-${index}`} className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
            {item}
            <span className="mx-10 text-brass/80">/</span>
          </span>
        ))}
      </div>
      <div className="ledger-marquee-reverse mt-3 flex w-max gap-10 pr-10">
        {row.map((item, index) => (
          <span key={`back-${item}-${index}`} className="font-mono text-[11px] tracking-[0.22em] text-foreground/35 uppercase">
            {item}
            <span className="mx-10 text-steel/80">/</span>
          </span>
        ))}
      </div>
    </div>
  );
}
