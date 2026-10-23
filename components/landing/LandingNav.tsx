"use client";

import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Wordmark } from "@/components/layout/Wordmark";

const LINKS = [
  { href: "#method", label: "Method" },
  { href: "#signals", label: "Signals" },
  { href: "#exhibit", label: "Exhibit" },
];

export function LandingNav({
  mode,
  opening = false,
  onOpenCase,
}: {
  mode: "mock" | "live";
  opening?: boolean;
  onOpenCase: () => void;
}) {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  useMotionValueEvent(scrollY, "change", (value) => {
    const next = value > 12;
    setSolid((current) => (current === next ? current : next));
  });

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        solid ? "border-b border-border/80 bg-background/75 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <a href="#content" className="rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <Wordmark />
        </a>
        <nav aria-label="Landing" className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <p className="hidden font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase sm:block">
            {mode === "mock" ? "Mock ledger · API ready" : "Live API"}
          </p>
          <button
            type="button"
            disabled={opening}
            onClick={onOpenCase}
            className="inline-flex h-9 items-center rounded-full px-3 text-sm text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40"
          >
            Open a case
          </button>
          <button
            type="button"
            disabled={opening}
            onClick={onOpenCase}
            className="inline-flex h-9 items-center rounded-full bg-primary px-3.5 text-sm text-primary-foreground hover:bg-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40"
          >
            {opening ? "Opening..." : "Begin"}
          </button>
        </div>
      </div>
    </header>
  );
}

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-px origin-left bg-brass"
      style={{ scaleX: scrollYProgress }}
    />
  );
}
