import type { ReactNode } from "react";

/**
 * Text a screen reader reads and the screen does not show, such as the name of an icon-only button.
 * The first component here, and the proof that packages/ui renders and tests TSX (dl-5ssh.34.51).
 * The playground's primitives move in with dl-5ssh.34.6, on shadcn/ui and Tailwind
 * (david-learns/decisions/2026-10-03-learning-widgets-are-built-in-house-on-shadcn-ui-and-tailwind-md).
 */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        margin: -1,
        padding: 0,
        overflow: "hidden",
        clip: "rect(0 0 0 0)",
        whiteSpace: "nowrap",
        border: 0,
      }}
    >
      {children}
    </span>
  );
}
