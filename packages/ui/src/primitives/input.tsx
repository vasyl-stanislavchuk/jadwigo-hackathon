// shadcn/ui input (radix-vega, shadcn@4.21.1). The default kind is for one typed number (dl-0ax3):
// at least --kid-tap-min high, answer-sized tabular digits. kind="text" is an adult's field on an
// app page (dl-uukj.32.3): an email, a code, a name, 48 high (--jw-control-height, decision
// dl-og82) at the body size with proportional digits, on Zeszyt's paper and line. aria-invalid (a
// refused character or a field's problem, never a graded answer) shows the primary ring, not the
// try-again red, because red only ever marks a miss (dl-uukj.29.16). On an app page (the "app"
// register, dl-uukj.32.17) kind="text" is at the page body size and drops the soft focus ring: its
// edge turning the focus ink is the focus. A number field keeps the ring in either register.
//
// The adult's field (kind="text" on an app page, handoff dl-uukj.47.67 §6.2, D18): 34 high, 10 in,
// the field's lighter edge at 1 px; focus turns the edge the ink with a 2 px halo of the pick; a
// problem is the ink edge, a step heavier, never red (S3); disabled or read-only is the quiet fill.
// Textarea shares it (ADULT_FIELD).
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { type Register, useRegister } from "../lib/register.tsx";
import { cn } from "../lib/utils.ts";

const RING = "focus-visible:ring-4 focus-visible:ring-ring/50";

/** A field that can't be typed in (read-only) is the quiet fill; a button's :read-only is always on. */
export const READ_ONLY = "read-only:border-border read-only:bg-muted";

/** The adult's field look, which Textarea, Select's and the Combobox's triggers share. */
export const ADULT_FIELD =
  "w-full rounded-jw-control border border-input bg-background px-2.5 text-jw-page-body text-foreground proportional-nums outline-none transition-[color,border-color,box-shadow] duration-jw-fast placeholder:text-placeholder focus-visible:border-jw-focus focus-visible:ring-2 focus-visible:ring-selected aria-invalid:border-foreground aria-invalid:ring-1 aria-invalid:ring-foreground disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-placeholder";

const inputVariants = cva(
  "w-full border-2 border-input bg-background px-4 text-foreground transition-[color,border-color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-primary aria-invalid:ring-4 aria-invalid:ring-primary/30",
  {
    variants: {
      kind: {
        number: "min-h-kid-tap rounded-lg text-kid-answer font-semibold tabular-nums",
        text: "min-h-jw-control rounded-jw-small border-jw-line bg-jw-card text-jw-body text-jw-ink proportional-nums placeholder:text-jw-placeholder focus-visible:border-jw-focus",
      },
      register: { app: "", lesson: "" } satisfies Record<Register, string>,
    },
    compoundVariants: [
      { kind: "number", class: RING },
      { kind: "text", register: "lesson", class: RING },
      { kind: "text", register: "app", class: "text-jw-page-body" },
    ],
    defaultVariants: { kind: "number", register: "lesson" },
  },
);

function Input({
  className,
  type,
  kind = "number",
  ...props
}: React.ComponentProps<"input"> & Omit<VariantProps<typeof inputVariants>, "register">) {
  const register = useRegister();
  const adult = register === "app" && kind === "text";
  return (
    <input
      type={type}
      data-slot="input"
      data-kind={kind}
      className={cn(
        adult ? ["min-h-jw-control", ADULT_FIELD, READ_ONLY] : inputVariants({ kind, register }),
        className,
      )}
      {...props}
    />
  );
}

export { Input };
