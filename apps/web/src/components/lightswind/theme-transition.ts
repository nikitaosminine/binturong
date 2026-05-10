import { flushSync } from "react-dom";

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => {
    ready: Promise<void>;
  };
};

export function runThemeFadeTransition(updateTheme: () => void) {
  const transitionDocument = document as ViewTransitionDocument;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!transitionDocument.startViewTransition || prefersReducedMotion) {
    updateTheme();
    return;
  }

  const transition = transitionDocument.startViewTransition(() => {
    flushSync(updateTheme);
  });

  transition.ready
    .then(() => {
      document.documentElement.animate(
        { opacity: [0, 1] },
        {
          duration: 220,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {
      // The theme has already changed; a failed transition should not block the toggle.
    });
}
