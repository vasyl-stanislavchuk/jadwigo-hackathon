// A heading (dl-uukj.32.3), all bold. On an app page (the "app" register, dl-uukj.32.17) it reads
// the adult scale: h1 28, h2 22, h3 the page body, each at leading-tight. In a lesson, and outside
// any Page, h1 is on the prompt size, h2 on the instruction size and h3 on the body size.
import type { ComponentProps, ReactElement } from "react";
import { type Register, useRegister } from "../lib/register.tsx";
import { cn } from "../lib/utils.ts";

type Level = 1 | 2 | 3;

const TAG = { 1: "h1", 2: "h2", 3: "h3" } as const satisfies Record<Level, string>;

const SIZE: Record<Register, Record<Level, string>> = {
  app: {
    1: "text-jw-page-h1 leading-tight",
    2: "text-jw-page-h2 leading-tight",
    3: "text-jw-page-body leading-tight",
  },
  lesson: {
    1: "text-jw-prompt leading-tight",
    2: "text-jw-instruction leading-snug",
    3: "text-jw-body",
  },
};

function Heading({
  level = 1,
  className,
  ...props
}: ComponentProps<"h1"> & { level?: Level }): ReactElement {
  const Tag = TAG[level];
  const register = useRegister();
  return (
    <Tag
      data-slot="heading"
      data-level={level}
      className={cn(SIZE[register][level], "font-bold", className)}
      {...props}
    />
  );
}

export { Heading };
