"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
    <section className="relative flex min-h-[100svh] items-center px-4 pt-24 pb-16 md:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(520px 280px at 18% 20%, color-mix(in oklab, var(--brass) 16%, transparent), transparent 70%), radial-gradient(480px 320px at 88% 8%, color-mix(in oklab, var(--steel) 18%, transparent), transparent 70%)",
        }}
      />
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div>
          <motion.p
            className="kicker"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Forensic bill review
          </motion.p>
          <h1 className="mt-5 max-w-xl font-serif tracking-tight">
            <span className="block overflow-hidden text-6xl leading-[0.92] md:text-8xl">
              {WORDS.map((word, index) => (
                <motion.span
                  key={word}
                  className="inline-block"
                  initial={reduce ? false : { y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 0.8, delay: 0.08 * index, ease: [0.16, 1, 0.3, 1] }}
                >
                  {word}
                  {index < WORDS.length - 1 ? "\u00A0" : ""}
                </motion.span>
              ))}
            </span>
            <motion.span
              className="mt-4 block text-4xl leading-tight italic text-foreground/90 md:text-6xl"
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              Then make it defend itself.
            </motion.span>
          </h1>
          <motion.p
            className="mt-6 max-w-lg text-base leading-7 text-foreground/80"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.7 }}
          >
            DocuMend Ledger lines a hospital bill up with the policy, the discharge summary, the prescription, the reports, and the receipts. Duplicates, odd quantities, contradictions, missing records, and unpaid lines stay pinned to the page they came from.
          </motion.p>
          <motion.div
            className="mt-8 flex flex-col gap-3 sm:flex-row"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
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
          </motion.div>
        </div>

        <div className="relative [perspective:1200px]" onPointerMove={onMove} onPointerLeave={onLeave}>
          <motion.div
            aria-hidden
            className="ledger-float absolute -top-8 left-8 z-20 hidden rounded-2xl border border-brass/40 bg-background/90 px-3 py-2 text-xs shadow-xl backdrop-blur-md sm:block"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <p className="font-mono text-[10px] tracking-widest text-brass uppercase">Policy</p>
            <p className="mt-1">Room cap ₹8,000</p>
          </motion.div>
          <motion.div
            aria-hidden
            className="ledger-float-late absolute -right-2 -bottom-8 z-20 hidden rounded-2xl border border-clay/40 bg-background/90 px-3 py-2 text-xs shadow-xl backdrop-blur-md sm:block"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <p className="font-mono text-[10px] tracking-widest text-clay uppercase">Discharge</p>
            <p className="mt-1">Room vacated 11:40</p>
          </motion.div>
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
        </div>
      </div>
      <a
        href="#method"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[10px] tracking-[0.2em] text-muted-foreground uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring md:flex"
      >
        Scroll
        <span aria-hidden className="ledger-pulse h-8 w-px bg-foreground/40" />
      </a>
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
    </div>
  );
}
