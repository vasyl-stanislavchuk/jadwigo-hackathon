// The register a part draws in (dl-uukj.32.17, decision
// 2026-10-30-app-pages-take-an-adult-type-scale-h1-28-h2-22-body-17-and-the-a). "app" is a parent's
// page: the adult type scale (H1 28, H2 22, body 17 at leading 1.5) and a visible 3 px focus outline.
// "lesson" is the child's: the lesson's own sizes and no focus drawn on a button. Page provides it
// (prose is "app", kid is "lesson"), and anything outside a Page draws as a lesson, as before. A
// context, not CSS, because the parent's question sheet renders through a portal: it leaves the
// page's DOM but stays in its React tree, so it stays "app".
import { createContext, type ReactElement, type ReactNode, useContext } from "react";

export type Register = "app" | "lesson";

const RegisterContext = createContext<Register>("lesson");

export function RegisterProvider({
  value,
  children,
}: {
  value: Register;
  children?: ReactNode;
}): ReactElement {
  return <RegisterContext.Provider value={value}>{children}</RegisterContext.Provider>;
}

export function useRegister(): Register {
  return useContext(RegisterContext);
}

/**
 * The keyboard's frame on an app page, as the lesson's link draws it: a 3 px outline of the focus
 * ink, 3 px out, on :focus-visible only. It replaces shadcn's 4 px soft ring; parents tab through
 * forms, so it is always drawn there.
 */
export const PAGE_FOCUS =
  "focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-jw-focus";

/** The body size each register reads: a label, a third heading, a line the page says. */
export const BODY: Record<Register, string> = {
  app: "text-jw-page-body",
  lesson: "text-jw-body",
};

/**
 * The density a part draws at (decision 2026-11-01-the-parent-app-is-a-sidebar-shell-and-a-3-column-
 * lesson-workspac, dl-xo0q). "parent" is the signed-in parent's app: foundation.css's
 * [data-density="parent"] block, body 14, a control 34, corners 10, 1 px lines. A context as well
 * as an attribute, for the same reason as the register: a dialog, a sheet or a popover renders
 * through a portal and leaves the attribute's subtree, so it reads the context and writes the
 * attribute again on its own content.
 */
export type Density = "parent";

const DensityContext = createContext<Density | undefined>(undefined);

export function useDensity(): Density | undefined {
  return useContext(DensityContext);
}

/** The parent's density for everything inside: the "app" register, and data-density on one div. */
export function DensityScope({
  value,
  className,
  children,
}: {
  value: Density;
  className?: string;
  children?: ReactNode;
}): ReactElement {
  return (
    <RegisterProvider value="app">
      <DensityContext.Provider value={value}>
        <div data-density={value} className={className}>
          {children}
        </div>
      </DensityContext.Provider>
    </RegisterProvider>
  );
}
