// The adult's textarea (handoff dl-uukj.47.67 §6.2): the Input's field look, growing with its words to
// 6 lines and then scrolling (field-sizing; a browser without it keeps its rows and scrolls).
import * as React from "react";
import { cn } from "../lib/utils.ts";
import { ADULT_FIELD, READ_ONLY } from "./input.tsx";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  function Textarea({ className, rows = 2, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        rows={rows}
        className={cn(
          ADULT_FIELD,
          READ_ONLY,
          "field-sizing-content max-h-[calc(6lh+1rem)] resize-none overflow-y-auto py-2 leading-jw-page",
          className,
        )}
        {...props}
      />
    );
  },
);

export { Textarea };
