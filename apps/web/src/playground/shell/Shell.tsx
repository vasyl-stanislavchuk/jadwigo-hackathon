/**
 * The playground's frame (dl-w3.33): navigation on the left, the view in the middle, the controls
 * on the right. The left sidebar folds away (the button top-left, or Ctrl/Cmd+B) and is a drawer on
 * a narrow screen; the controls panel folds with the button top-right and is remembered.
 */

import { cn } from "@jadwigo/ui";
import { PanelRight } from "lucide-react";
import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import { Button } from "../tool/button.tsx";
import { Separator } from "../tool/separator.tsx";
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "../tool/sidebar.tsx";
import { TooltipProvider } from "../tool/tooltip.tsx";
import { ControlsTarget } from "./controls.tsx";
import { NavLink } from "./NavLink.tsx";
import { NavSidebar } from "./NavSidebar.tsx";

const CONTROLS_KEY = "playground:controls-open";

export interface Crumb {
  label: string;
  href?: string;
}

/** `controls` false hides the right panel on a view that has none (the start page). */
export function Shell({
  crumbs,
  controls = true,
  children,
}: {
  crumbs: Crumb[];
  controls?: boolean;
  children: ReactNode;
}): JSX.Element {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  // A column beside the page on a wide screen (open unless closed before); a drawer over it on a
  // narrow one, which starts closed so it never covers the exercise.
  const wide = (): boolean => window.matchMedia?.("(min-width: 64rem)").matches ?? true;
  const [controlsOpen, setControlsOpen] = useState(
    () => wide() && window.localStorage.getItem(CONTROLS_KEY) !== "closed",
  );
  useEffect(() => {
    if (wide()) window.localStorage.setItem(CONTROLS_KEY, controlsOpen ? "open" : "closed");
  }, [controlsOpen]);

  return (
    <TooltipProvider delayDuration={300}>
      <SidebarProvider
        className="playground-shell text-sm"
        style={{ "--sidebar-width": "19rem" } as CSSProperties}
      >
        <NavSidebar />
        <SidebarInset className="min-w-0">
          {/* data-credit-ceiling and data-credit-room: where a question's credit card may open
                        without covering the question or the controls (QuestionCredit.tsx, dl-uukj.29.138). */}
          <header
            data-credit-ceiling
            className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-3"
          >
            <SidebarTrigger aria-label="Show or hide the navigation" />
            <Separator
              orientation="vertical"
              className="mx-1 data-vertical:h-5 data-vertical:self-center"
            />
            <nav
              aria-label="Where you are"
              className="flex min-w-0 flex-1 items-center gap-1.5 text-sm"
            >
              {crumbs.map((c, i) => (
                <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
                  {i > 0 && <span className="text-muted-foreground">/</span>}
                  {c.href !== undefined && i < crumbs.length - 1 ? (
                    <NavLink
                      href={c.href}
                      className="text-muted-foreground truncate hover:text-foreground"
                    >
                      {c.label}
                    </NavLink>
                  ) : (
                    <span className={cn("truncate", i === crumbs.length - 1 && "font-medium")}>
                      {c.label}
                    </span>
                  )}
                </span>
              ))}
            </nav>
            {controls && (
              <Button
                variant={controlsOpen ? "secondary" : "ghost"}
                size="sm"
                aria-pressed={controlsOpen}
                onClick={() => setControlsOpen((o) => !o)}
              >
                <PanelRight aria-hidden />
                Controls
              </Button>
            )}
          </header>
          <div className="flex min-w-0 flex-1">
            <div data-credit-room className="min-w-0 flex-1">
              <ControlsTarget.Provider value={target}>{children}</ControlsTarget.Provider>
            </div>
            <aside
              aria-label="Playground controls"
              hidden={!controls || !controlsOpen}
              className={cn(
                "border-l bg-sidebar",
                // A drawer over the page on a narrow screen, a column beside it on a wide one.
                "fixed top-12 right-0 bottom-0 z-30 w-80 shadow-lg lg:sticky lg:z-0 lg:h-[calc(100svh-3rem)] lg:shadow-none",
              )}
            >
              <Sidebar collapsible="none" className="h-full w-full">
                <SidebarContent className="py-2">
                  <div ref={setTarget} className="flex flex-col" data-controls />
                </SidebarContent>
              </Sidebar>
            </aside>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
