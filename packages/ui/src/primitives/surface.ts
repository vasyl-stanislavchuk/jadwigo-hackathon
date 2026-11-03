// The adult overlays' shared look (handoff dl-uukj.47.67 §5, §6.10, S20): what floats (a menu, a
// popover, a toast) is white on the warm 1 px line, corners 8 and the one soft shadow; a dialog takes
// the deeper shadow. Menu rows are the body size on a quiet fill when highlighted. Tokens only.

/** A floating layer: a menu's or a popover's box. */
export const FLOAT =
  "z-50 rounded-md border border-border bg-popover text-popover-foreground shadow-float outline-none";

/** A menu's content: the float with a 4 px inset for its rows. */
export const MENU_CONTENT = `${FLOAT} min-w-48 overflow-hidden p-1 text-jw-page-body`;

/** A menu row: highlighted by mouse or keys on the quiet fill, icons 16, centred on the line (D19). */
export const MENU_ITEM =
  "relative flex cursor-default items-center gap-2 rounded-jw-small px-2 py-1.5 outline-none select-none focus-visible:shadow-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:text-placeholder [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

/** A checkbox or radio row: room on the left for its mark. */
export const MENU_CHOICE = `${MENU_ITEM} pl-8`;

/** Where a checkbox or radio row draws its mark. */
export const MENU_MARK =
  "pointer-events-none absolute left-2 flex size-4 items-center justify-center";

export const MENU_LABEL = "px-2 py-1.5 text-jw-page-small font-medium text-muted-foreground";

export const MENU_SEPARATOR = "-mx-1 my-1 h-px bg-border";

/** A dialog's box, as Dialog drew it before the adult layer (dl-xo0q); AlertDialog shares it. */
export const DIALOG_BOX =
  "fixed inset-x-4 top-1/2 z-50 mx-auto flex max-w-jw-dialog -translate-y-1/2 flex-col gap-4 rounded-jw-dialog border-jw border-jw-line bg-jw-card p-6 text-jw-page-body leading-jw-page text-jw-ink outline-none";

export const DIALOG_OVERLAY = "fixed inset-0 z-50 bg-jw-ink/40";
