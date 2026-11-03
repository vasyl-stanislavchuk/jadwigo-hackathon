/** The line that says a parent page could not load: what stops the adult, with what to do. */

import { copy, type Language } from "@jadwigo/copy";
import { Notice } from "@jadwigo/ui";
import { CircleAlert } from "lucide-react";
import type { ReactElement } from "react";
import { CATEGORY } from "./adult.ts";

export function Failed({ language }: { language: Language }): ReactElement {
  return (
    <Notice role="alert" icon={<CircleAlert aria-hidden="true" />} data-failed>
      {copy(language, "parent_load_failed", {}, CATEGORY)}
    </Notice>
  );
}
