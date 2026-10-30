// shadcn/ui input (radix-vega, shadcn@4.21.1). The default kind is for one typed number (dl-0ax3):
// at least --kid-tap-min high, answer-sized tabular digits. kind="text" is an adult's field on an
// app page (dl-uukj.32.3): an email, a code, a name, 48 high (--jw-control-height, decision
// dl-og82) at the body size with proportional digits, on Zeszyt's paper and line. aria-invalid (a
// refused character or a field's problem, never a graded answer) shows the primary ring, not the
// try-again red, because red only ever marks a miss (dl-uukj.29.16).
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../lib/utils.ts";

const inputVariants = cva(
  "w-full border-2 border-input bg-background px-4 text-foreground transition-[color,border-color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-primary aria-invalid:ring-4 aria-invalid:ring-primary/30",
  {
    variants: {
      kind: {
        number: "min-h-kid-tap rounded-lg text-kid-answer font-semibold tabular-nums",
        text: "min-h-jw-control rounded-jw-small border-jw-line bg-jw-card text-jw-body text-jw-ink proportional-nums placeholder:text-jw-placeholder focus-visible:border-jw-focus",
      },
    },
    defaultVariants: { kind: "number" },
  },
);

function Input({
  className,
  type,
  kind = "number",
  ...props
}: React.ComponentProps<"input"> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      data-kind={kind}
      className={cn(inputVariants({ kind }), className)}
      {...props}
    />
  );
}

export { Input };
