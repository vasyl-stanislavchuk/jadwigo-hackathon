// A heading on an app page (dl-uukj.32.3), at the app-page register: h1 on the prompt size, h2 on
// the instruction size, h3 on the body size, all bold.
import type { ComponentProps, ReactElement } from "react";
import { cn } from "../lib/utils.ts";

type Level = 1 | 2 | 3;

const TAG = { 1: "h1", 2: "h2", 3: "h3" } as const satisfies Record<Level, string>;

const SIZE: Record<Level, string> = {
  1: "text-jw-prompt leading-tight",
  2: "text-jw-instruction leading-snug",
  3: "text-jw-body",
};

function Heading({
  level = 1,
  className,
  ...props
}: ComponentProps<"h1"> & { level?: Level }): ReactElement {
  const Tag = TAG[level];
  return (
    <Tag
      data-slot="heading"
      data-level={level}
      className={cn(SIZE[level], "font-bold", className)}
      {...props}
    />
  );
}

export { Heading };
