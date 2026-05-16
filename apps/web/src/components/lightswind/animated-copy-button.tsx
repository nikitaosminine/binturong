import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type AnimatedCopyButtonProps = {
  textToCopy: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  ariaLabel?: string;
  onCopy?: () => void;
  onCopyError?: () => void;
};

const sizes = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const iconSizes = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function AnimatedCopyButton({
  textToCopy,
  disabled = false,
  className,
  size = "md",
  ariaLabel = "Copy to clipboard",
  onCopy,
  onCopyError,
}: AnimatedCopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, []);

  const handleCopy = async () => {
    if (disabled || !textToCopy) {
      onCopyError?.();
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      onCopy?.();

      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setIsCopied(false), 1200);
    } catch {
      onCopyError?.();
    }
  };

  const iconMotion = shouldReduceMotion
    ? {
        initial: false,
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.08 },
      }
    : {
        initial: { opacity: 0, scale: 0.65, rotate: -12 },
        animate: { opacity: 1, scale: 1, rotate: 0 },
        exit: { opacity: 0, scale: 0.65, rotate: 12 },
        transition: { type: "spring" as const, stiffness: 520, damping: 32, mass: 0.55 },
      };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled}
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-md border border-hairline bg-surface-2 text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45",
        sizes[size],
        isCopied && "border-foreground/40 text-foreground",
        className,
      )}
      aria-label={ariaLabel}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isCopied ? (
          <motion.span key="check" className="absolute grid place-items-center" {...iconMotion}>
            <Check className={iconSizes[size]} />
          </motion.span>
        ) : (
          <motion.span key="copy" className="absolute grid place-items-center" {...iconMotion}>
            <Copy className={iconSizes[size]} />
          </motion.span>
        )}
      </AnimatePresence>
      {isCopied && !shouldReduceMotion && (
        <motion.span
          className="absolute inset-0 rounded-md bg-positive/15"
          initial={{ opacity: 0.45, scale: 1 }}
          animate={{ opacity: 0, scale: 1.55 }}
          transition={{ duration: 0.24 }}
          aria-hidden
        />
      )}
    </button>
  );
}
