import type { ReactNode } from "react";

/** How a body draws one gap, by its id: the view hands each body this. */
export type Slot = (id: string) => ReactNode;
