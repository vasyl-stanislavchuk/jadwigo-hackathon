// The email code at sign-in (handoff dl-uukj.47.67 §6.2, lead decision 5: no OTP library): one numeric
// input, so a paste, the phone's code suggestion (one-time-code) and a screen reader all meet one
// field, drawn as 6 cells. The input lies over the cells, transparent; the cell where the next digit
// goes carries the focus halo. Only digits are kept. The cells copy the code into the page, and
// session replay masks only inputs, so the whole field is ph-no-capture: replay never records it.
import { type ChangeEvent, type ComponentProps, type ReactElement, useState } from "react";
import { cn } from "../lib/utils.ts";

function InputOtp({
  value,
  onChange,
  length = 6,
  className,
  ...props
}: Omit<ComponentProps<"input">, "value" | "onChange" | "type" | "maxLength"> & {
  value: string;
  onChange(value: string): void;
  length?: number;
}): ReactElement {
  const [focused, setFocused] = useState(false);
  const cells = Array.from({ length }, (_, i) => value[i] ?? "");
  const at = Math.min(value.length, length - 1);
  return (
    <div
      data-slot="input-otp"
      className={cn("ph-no-capture relative inline-flex gap-2", className)}
    >
      {cells.map((digit, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: the cells are positions, fixed in number
          key={i}
          aria-hidden="true"
          data-active={focused && i === at ? "" : undefined}
          className="grid h-jw-control-lg w-9 place-items-center rounded-jw-control border border-input bg-background font-mono text-jw-page-body font-medium text-foreground tabular-nums data-active:border-primary data-active:ring-2 data-active:ring-selected"
        >
          {digit}
        </span>
      ))}
      <input
        data-slot="input-otp-field"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={length}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value.replace(/\D/g, "").slice(0, length))
        }
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        // The cells draw the focus; the field itself is invisible over them.
        className="absolute inset-0 w-full cursor-text bg-transparent text-transparent caret-transparent opacity-0 outline-none focus-visible:shadow-none"
        {...props}
      />
    </div>
  );
}

export { InputOtp };
