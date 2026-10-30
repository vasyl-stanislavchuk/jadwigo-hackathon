// One labelled control with the line that says what is wrong with it (dl-uukj.32.3). Field gives
// the control its id, ties the label to it and, while there is a problem, marks it invalid and
// points aria-describedby at the problem line, a role="alert" so a screen reader says it at once.
// A problem is not a miss: it is said in the ink with a mark, never in the miss's red.
import { CircleAlert } from "lucide-react";
import { cloneElement, type ReactElement, type ReactNode, useId } from "react";
import { cn } from "../lib/utils.ts";
import { Label } from "./label.tsx";

interface ControlProps {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

function Field({
  label,
  problem,
  children,
  className,
}: {
  label: ReactNode;
  /** What is wrong with the value, in words; nothing while it is fine. */
  problem?: ReactNode;
  /** The one control: an Input, a select, a textarea. */
  children: ReactElement<ControlProps>;
  className?: string;
}): ReactElement {
  const own = useId();
  const id = children.props.id ?? `${own}-control`;
  const problemId = `${own}-problem`;
  // An empty problem is none: no alert, and the control stays valid.
  const wrong = problem !== undefined && problem !== null && problem !== false && problem !== "";
  const described = [children.props["aria-describedby"], wrong ? problemId : undefined]
    .filter((v): v is string => v !== undefined)
    .join(" ");
  const control = cloneElement(children, {
    id,
    ...(described === "" ? {} : { "aria-describedby": described }),
    ...(wrong ? { "aria-invalid": true } : {}),
  });
  return (
    <div data-slot="field" className={cn("flex w-full flex-col gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {control}
      {wrong && (
        <p
          role="alert"
          id={problemId}
          data-slot="field-problem"
          className="flex items-start gap-2 text-jw-body text-jw-ink"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <span>{problem}</span>
        </p>
      )}
    </div>
  );
}

export { Field };
