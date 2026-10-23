"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import type { PipelineStage } from "@/lib/types/domain";

export function AnalysisTimeline({
  stages,
  compact = false,
}: {
  stages: PipelineStage[];
  compact?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <ol
      className={compact ? "grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4" : "space-y-0"}
      aria-label="Analysis pipeline"
    >
      {stages.map((stage, index) => {
        const active = stage.state === "active";
        const complete = stage.state === "complete";
        return (
            <li
            key={stage.id}
            aria-current={active ? "step" : undefined}
            className={compact ? "min-w-0" : "relative pb-5 pl-8 last:pb-0"}
          >
            {!compact && index < stages.length - 1 ? (
              <span
                className={`absolute top-4 left-[7px] h-[calc(100%-8px)] w-px ${complete ? "bg-foreground/40" : "bg-border"}`}
                aria-hidden
              />
            ) : null}
            <span
              className={`flex items-center justify-center rounded-full border ${
                compact ? "mb-2 size-2.5" : "absolute top-1 left-0 size-4"
              } ${
                complete
                  ? "border-foreground bg-foreground text-background"
                  : active
                    ? "border-brass bg-brass/20"
                    : "border-border bg-background"
              }`}
              aria-hidden
            >
              {complete && !compact ? <Check className="size-2.5" /> : null}
              {active && !compact ? (
                <motion.span
                  className="size-1.5 rounded-full bg-brass"
                  animate={reduce ? undefined : { opacity: [1, 0.35, 1] }}
                  transition={reduce ? undefined : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                />
              ) : null}
            </span>
            <p className={`text-sm ${compact ? "truncate" : ""} ${active || complete ? "text-foreground" : "text-muted-foreground"}`}>{stage.label}</p>
            {!compact ? <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{stage.description}</p> : null}
          </li>
        );
      })}
    </ol>
  );
}
