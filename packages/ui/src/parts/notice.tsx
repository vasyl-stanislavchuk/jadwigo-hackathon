// A line the page tells the adult (dl-uukj.32.3): "status" for news that can wait its turn (a code
// was sent), "alert" for what stops them (the code did not go). A screen reader hears a status when
// it is free and an alert at once. Neither wears the right's green or the miss's red: the alert is
// the ink on a strong line, with the caller's mark.
import type { ComponentProps, ReactElement, ReactNode } from "react";
import { cn } from "../lib/utils.ts";

type Role = "status" | "alert";

function Notice({
  role = "status",
  icon,
  className,
  children,
  ...props
}: Omit<ComponentProps<"div">, "role"> & { role?: Role; icon?: ReactNode }): ReactElement {
  return (
    <div
      role={role}
      data-slot="notice"
      data-role={role}
      className={cn(
        "flex w-full items-start gap-3 rounded-jw-card border-2 bg-jw-card p-4 text-jw-body text-jw-ink [&_svg]:mt-0.5 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
        role === "alert" ? "border-jw-line-strong font-bold" : "border-jw-line",
        className,
      )}
      {...props}
    >
      {icon}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export { Notice };
