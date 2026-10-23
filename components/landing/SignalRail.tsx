"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { SIGNALS } from "@/components/landing/landing-copy";

export function SignalRail() {
  const reduce = useReducedMotion();
  return (
    <div id="signals" className="scroll-mt-24">
      {reduce ? <StackedSignals /> : (
        <>
          <div className="lg:hidden">
            <StackedSignals />
          </div>
          <div className="hidden lg:block">
            <HorizontalSignals />
          </div>
        </>
      )}
    </div>
  );
}

function StackedSignals() {
  return (
    <section className="px-4 py-20 md:px-6">
      <Header />
      <div className="mx-auto mt-10 grid max-w-6xl gap-4 md:grid-cols-2">
        {SIGNALS.map((signal, index) => (
          <SignalCard key={signal.id} signal={signal} index={index} />
        ))}
      </div>
    </section>
  );
}

function HorizontalSignals() {
  const ref = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, (value) => {
    const width = track.current?.scrollWidth ?? 0;
    const viewport = typeof window === "undefined" ? 1280 : window.innerWidth;
    const distance = Math.max(0, width - viewport + 96);
    return -distance * value;
  });
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const next = Math.min(SIGNALS.length - 1, Math.floor(value * SIGNALS.length * 0.999));
    setActive((current) => (current === next ? current : next));
  });

  return (
    <section ref={ref} className="relative h-[260vh]">
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden">
        <div className="px-6">
          <Header active={active} />
        </div>
        <motion.div ref={track} style={{ x }} className="mt-10 flex w-max gap-5 px-6">
          {SIGNALS.map((signal) => (
            <SignalCard key={signal.id} signal={signal} wide />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Header({ active }: { active?: number }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl items-end justify-between gap-6">
      <div>
        <p className="kicker">Signals</p>
        <h2 className="mt-3 max-w-xl font-serif text-4xl leading-[1.02] md:text-6xl">What the ledger is willing to accuse.</h2>
      </div>
      {typeof active === "number" ? (
        <p className="font-mono text-sm text-muted-foreground">
          {String(active + 1).padStart(2, "0")} / {String(SIGNALS.length).padStart(2, "0")}
        </p>
      ) : null}
    </div>
  );
}

function SignalCard({
  signal,
  index = 0,
  wide = false,
}: {
  signal: (typeof SIGNALS)[number];
  index?: number;
  wide?: boolean;
}) {
  return (
    <motion.article
      initial={wide ? false : { opacity: 0, y: 28 }}
      whileInView={wide ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ delay: index * 0.05, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      whileHover={wide ? { y: -8 } : undefined}
      className={`panel group relative flex flex-col justify-between overflow-hidden p-6 ${wide ? "h-[440px] w-[360px]" : "min-h-80"}`}
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brass/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div>
        <p className="font-mono text-[11px] tracking-[0.16em] text-brass uppercase">
          {String(SIGNALS.findIndex((item) => item.id === signal.id) + 1).padStart(2, "0")} · {signal.kicker}
        </p>
        <h3 className="mt-4 font-serif text-3xl leading-[1.05]">{signal.title}</h3>
      </div>
      <SignalGlyph id={signal.id} />
      <p className="text-sm leading-6 text-muted-foreground">{signal.detail}</p>
    </motion.article>
  );
}

function SignalGlyph({ id }: { id: (typeof SIGNALS)[number]["id"] }) {
  if (id === "duplicate") {
    return (
      <div aria-hidden className="my-6 space-y-2 font-mono text-[11px]">
        <p className="rounded-lg border border-border px-3 py-2">14 Oct 08:14 · Pantoprazole · ₹920</p>
        <p className="ledger-pulse rounded-lg border border-brass/50 bg-brass/10 px-3 py-2 text-brass">14 Oct 08:14 · Pantoprazole · ₹920</p>
      </div>
    );
  }
  if (id === "quantity") {
    return (
      <div aria-hidden className="my-6">
        <div className="h-2 overflow-hidden rounded-full bg-border">
          <div className="h-full w-[18%] rounded-full bg-sage" />
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
          <div className="h-full w-[92%] rounded-full bg-clay" />
        </div>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">usual 8–12 · billed 48</p>
      </div>
    );
  }
  if (id === "contradiction") {
    return (
      <div aria-hidden className="my-6 grid grid-cols-2 gap-2 text-[11px]">
        <p className="rounded-lg border border-border p-3">Bill · full day on the 16th</p>
        <p className="rounded-lg border border-clay/40 p-3 text-clay">Summary · vacated at 11:40</p>
      </div>
    );
  }
  if (id === "missing") {
    return (
      <div aria-hidden className="my-6 rounded-xl border border-dashed border-border px-4 py-5 text-center">
        <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Expected</p>
        <p className="mt-2 text-sm">Operative notes</p>
      </div>
    );
  }
  if (id === "insurance") {
    return (
      <div aria-hidden className="my-6 flex items-end justify-between font-mono text-[11px]">
        <span>
          <span className="block text-muted-foreground">Billed</span>₹12,500
        </span>
        <span className="text-sage">
          <span className="block text-muted-foreground">Allowed</span>₹8,000
        </span>
        <span className="text-brass">
          <span className="block text-muted-foreground">Patient</span>₹4,500
        </span>
      </div>
    );
  }
  if (id === "why") {
    return (
      <p aria-hidden className="my-6 font-serif text-2xl leading-snug italic text-foreground/80">
        “A schedule is not required to refuse them.”
      </p>
    );
  }
  if (id === "evidence") {
    return (
      <p aria-hidden className="my-6 border-l border-brass pl-3 text-sm leading-6">
        Room vacated at discharge. <span className="bg-brass/20">No overnight stay on the 16th.</span>
      </p>
    );
  }
  return (
    <p aria-hidden className="my-6 font-mono text-[11px] leading-6 text-muted-foreground">
      You · Why isn&apos;t the room paid in full?
      <br />
      DocuMend · Schedule cl. 4.2 · p. 2
    </p>
  );
}
