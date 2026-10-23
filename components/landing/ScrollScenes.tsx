"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";

const STATEMENT = ["The", "bill", "speaks.", "The", "record", "answers."];

const PAGES = [
  { kicker: "Hospital bill", title: "Final inpatient bill", detail: "6 pages · deluxe still on the 16th" },
  { kicker: "Policy schedule", title: "Gold Assure", detail: "Room cap ₹8,000 · 10% co-pay" },
  { kicker: "Discharge summary", title: "Left at 11:40", detail: "Room vacated. No drain." },
  { kicker: "Diagnostic report", title: "Ultrasound only", detail: "No MRCP in the study." },
];

const CHAPTERS = [
  { id: "hero", label: "Open" },
  { id: "method", label: "Method" },
  { id: "signals", label: "Signals" },
  { id: "exhibit", label: "Exhibit" },
  { id: "open", label: "File" },
];

export function StatementScrub() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  if (reduce) {
    return (
      <section className="px-4 py-24 md:px-6">
        <h2 className="mx-auto max-w-5xl font-serif text-5xl leading-[1.05] md:text-7xl">{STATEMENT.join(" ")}</h2>
      </section>
    );
  }

  return (
    <section ref={ref} className="relative h-[150vh]">
      <div className="sticky top-0 flex h-[100svh] items-center px-4 md:px-6">
        <h2 className="mx-auto max-w-5xl font-serif text-5xl leading-[1.08] md:text-7xl">
          {STATEMENT.map((word, index) => (
            <ScrubWord key={`${word}-${index}`} index={index} total={STATEMENT.length} progress={scrollYProgress}>
              {word}
            </ScrubWord>
          ))}
        </h2>
      </div>
    </section>
  );
}

function ScrubWord({
  children,
  index,
  total,
  progress,
}: {
  children: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const start = index / total;
  const end = Math.min(1, start + 1 / total);
  const color = useTransform(progress, [start, end], ["oklch(0.72 0.02 85)", "oklch(0.97 0.012 90)"]);
  return (
    <motion.span style={{ color }} className="mr-[0.28em] inline-block text-foreground/45">
      {children}
    </motion.span>
  );
}

export function PageFan() {
  const reduce = useReducedMotion();
  if (reduce) return <FanStack />;
  return (
    <>
      <div className="lg:hidden">
        <FanStack />
      </div>
      <div className="hidden lg:block">
        <FanScrub />
      </div>
    </>
  );
}

function FanStack() {
  return (
    <section className="px-4 py-20 md:px-6">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
        <FanCopy />
        <div className="grid gap-3">
          {PAGES.map((page) => (
            <article key={page.title} className="panel p-5">
              <p className="kicker">{page.kicker}</p>
              <h3 className="mt-2 font-serif text-2xl">{page.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{page.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FanScrub() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  return (
    <section ref={ref} className="relative h-[180vh]">
      <div className="sticky top-0 flex h-[100svh] items-center px-6">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-2">
          <FanCopy />
          <div className="relative h-[460px]">
            {PAGES.map((page, index) => (
              <FanCard key={page.title} page={page} index={index} progress={scrollYProgress} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FanCopy() {
  return (
    <div>
      <p className="kicker">The file</p>
      <h2 className="mt-3 font-serif text-4xl leading-[1.02] md:text-6xl">Four records separate as you scroll.</h2>
      <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
        The bill, the schedule, the discharge summary, and the report start as one stack. The further you read, the clearer the disagreement.
      </p>
    </div>
  );
}

function FanCard({
  page,
  index,
  progress,
}: {
  page: (typeof PAGES)[number];
  index: number;
  progress: MotionValue<number>;
}) {
  const x = useTransform(progress, [0, 1], [0, (index - 1.5) * 10]);
  const y = useTransform(progress, [0, 1], [index * 14, 8 + index * 78]);
  const rotate = useTransform(progress, [0, 1], [0, (index - 1.5) * 1.4]);
  return (
    <motion.article
      style={{ x, y, rotate, zIndex: index + 1, backgroundColor: "var(--background)" }}
      className="panel absolute inset-x-8 top-4 p-5"
    >
      <p className="kicker">{page.kicker}</p>
      <h3 className="mt-2 font-serif text-3xl">{page.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{page.detail}</p>
    </motion.article>
  );
}

export function ChapterRail() {
  const [active, setActive] = useState("hero");

  useEffect(() => {
    const nodes = CHAPTERS.map((chapter) => document.getElementById(chapter.id)).filter((node): node is HTMLElement => Boolean(node));
    if (nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: [0.1, 0.4] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Page chapters" className="fixed top-1/2 right-4 z-30 hidden -translate-y-1/2 min-[1500px]:block">
      <ol className="flex flex-col gap-3">
        {CHAPTERS.map((chapter) => {
          const on = active === chapter.id;
          return (
            <li key={chapter.id}>
              <a
                href={`#${chapter.id}`}
                aria-current={on ? "true" : undefined}
                className="group flex items-center justify-end gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                <span className={`font-mono text-[10px] tracking-widest uppercase transition-colors ${on ? "text-brass" : "text-transparent group-hover:text-muted-foreground"}`}>
                  {chapter.label}
                </span>
                <span className={`block h-1.5 rounded-full transition-all ${on ? "w-6 bg-brass" : "w-1.5 bg-foreground/30"}`} />
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function DriftGrid() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, (value) => value * 0.18);
  if (reduce) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 opacity-50"
      style={{
        y,
        backgroundImage:
          "linear-gradient(to right, color-mix(in oklab, var(--brass) 18%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 5%, transparent) 1px, transparent 1px)",
        backgroundSize: "120px 120px",
      }}
    />
  );
}
