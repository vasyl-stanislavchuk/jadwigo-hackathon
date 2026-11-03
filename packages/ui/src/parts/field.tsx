// One labelled control with the line that says what is wrong with it (dl-uukj.32.3). Field gives
// the control its id, ties the label to it and, while there is a problem, marks it invalid and
// points aria-describedby at the problem line, a role="alert" so a screen reader says it at once.
// A problem is not a miss: it is said in the ink with a mark, never in the miss's red. On an app
// page (dl-uukj.32.17) the line is at the page body size. The adult's (handoff dl-uukj.47.67 §6.2,
// S3): a 14/500 label, an optional description under the control (12.5, muted, also pointed at by
// aria-describedby), and the problem in the ink with a 16 px alert mark, which replaces the
// description while it shows.
import { CircleAlert } from "lucide-react";
import { cloneElement, type ReactElement, type ReactNode, useId } from "react";
import { BODY, useRegister } from "../lib/register.tsx";
import { cn } from "../lib/utils.ts";
import { Label } from "./label.tsx";

interface ControlProps {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

function Field({
  label,
  description,
  problem,
  children,
  className,
}: {
  label: ReactNode;
  /** A line under the control: a hint, or why it is read-only. */
  description?: ReactNode;
  /** What is wrong with the value, in words; nothing while it is fine. */
  problem?: ReactNode;
  /** The one control: an Input, a select, a textarea. */
  children: ReactElement<ControlProps>;
  className?: string;
}): ReactElement {
  const own = useId();
  const register = useRegister();
  const size = BODY[register];
  const adult = register === "app";
  const id = children.props.id ?? `${own}-control`;
  const problemId = `${own}-problem`;
  const descriptionId = `${own}-description`;
  // An empty problem is none: no alert, and the control stays valid.
  const wrong = problem !== undefined && problem !== null && problem !== false && problem !== "";
  const hint = !wrong && description !== undefined;
  const described = [
    children.props["aria-describedby"],
    wrong ? problemId : undefined,
    hint ? descriptionId : undefined,
  ]
    .filter((v): v is string => v !== undefined)
    .join(" ");
  const control = cloneElement(children, {
    id,
    ...(described === "" ? {} : { "aria-describedby": described }),
    ...(wrong ? { "aria-invalid": true } : {}),
  });
  return (
    <div
      data-slot="field"
      className={cn("flex w-full flex-col", adult ? "gap-1.5" : "gap-2", className)}
    >
      <Label htmlFor={id}>{label}</Label>
      {control}
      {wrong && (
        <p
          role="alert"
          id={problemId}
          data-slot="field-problem"
          className={cn("flex items-start text-jw-ink", adult ? "gap-1.5" : "gap-2", size)}
        >
          <CircleAlert
            aria-hidden="true"
            className={cn("shrink-0", adult ? "mt-px size-4" : "mt-0.5 size-5")}
          />
          <span>{problem}</span>
        </p>
      )}
      {hint && (
        <p
          id={descriptionId}
          data-slot="field-description"
          className="text-jw-page-small text-muted-foreground"
        >
          {description}
        </p>
      )}
    </div>
  );
}

export { Field };
