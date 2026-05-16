"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type BeamColor = "cyan-400" | "green-400" | "blue-400" | "red-400" | "indigo-400";

type FallBeamBackgroundProps = {
  className?: string;
  lineCount?: number;
  beamColorClass?: BeamColor;
};

const beamColors: Record<BeamColor, string> = {
  "cyan-400": "rgba(34, 211, 238, 0.55)",
  "green-400": "rgba(74, 222, 128, 0.55)",
  "blue-400": "rgba(96, 165, 250, 0.55)",
  "red-400": "rgba(248, 113, 113, 0.55)",
  "indigo-400": "rgba(129, 140, 248, 0.55)",
};

function fractional(seed: number) {
  return Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
}

export default function FallBeamBackground({
  className,
  lineCount = 22,
  beamColorClass = "cyan-400",
}: FallBeamBackgroundProps) {
  const shouldReduceMotion = useReducedMotion();
  // The beams use computed (deterministic-but-float) positions and depend on
  // useReducedMotion, both of which differ between the server render and the
  // client hydration render. Defer them to a post-mount client render so the
  // server/client first paint match exactly (no hydration mismatch).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const beams = useMemo(
    () =>
      Array.from({ length: lineCount }, (_, index) => {
        const position = ((index + 0.5) / lineCount) * 100 + (fractional(index + 1) - 0.5) * 4;
        const duration = 8 + fractional(index + 9) * 8;
        const delay = -fractional(index + 17) * 12;

        return { position, duration, delay };
      }),
    [lineCount],
  );

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 isolate overflow-hidden bg-background",
        className,
      )}
      aria-hidden
      style={{ "--fall-beam-color": beamColors[beamColorClass] } as CSSProperties}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,var(--accent-teal-soft),transparent_42%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,var(--background)_86%)]" />
      {mounted &&
        beams.map((beam, index) => (
          <span
            key={index}
            className={cn(
              "absolute top-0 h-full w-px bg-foreground/5",
              shouldReduceMotion ? "opacity-35" : "fall-beam-line",
            )}
            style={
              {
                left: `${beam.position}%`,
                "--fall-beam-duration": `${beam.duration}s`,
                "--fall-beam-delay": `${beam.delay}s`,
              } as CSSProperties
            }
          />
        ))}
    </div>
  );
}
