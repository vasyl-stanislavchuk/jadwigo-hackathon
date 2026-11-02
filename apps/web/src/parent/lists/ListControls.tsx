/**
 * The row above the Lekcje and Historia tables (handoff §3 "Lists = table + filter"): the segmented
 * filter on the left (Wszystkie, each child by name, Bez dziecka) and the search field on the right.
 */

import type { Learner } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Input, SegmentedControl } from "@jadwigo/ui";
import type { ReactElement } from "react";
import { CATEGORY } from "../adult.ts";
import type { Who } from "./filter.ts";

export function ListControls({
  language,
  learners,
  who,
  onWho,
  search,
  onSearch,
}: {
  language: Language;
  learners: readonly Learner[];
  who: Who;
  onWho: (who: Who) => void;
  search: string;
  onSearch: (search: string) => void;
}): ReactElement {
  const t = (key: CopyKey): string => copy(language, key, {}, CATEGORY);
  const options = [
    { value: "all", label: t("parent_filter_all") },
    ...learners.map((learner) => ({ value: learner.id, label: learner.first_name })),
    { value: "none", label: t("parent_no_child") },
  ];
  return (
    <div className="flex flex-wrap items-end justify-between gap-3" data-list-controls>
      <SegmentedControl
        label={t("parent_filter_label")}
        hideLabel
        size="sm"
        options={options}
        value={who}
        // Every value is one of the options above: "all", "none" or a child's id.
        onChange={(value) => onWho(value as Who)}
        className="max-w-full overflow-x-auto"
      />
      <Input
        kind="text"
        type="search"
        aria-label={t("parent_search")}
        placeholder={t("parent_search")}
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        className="w-full sm:w-64"
        data-list-search
      />
    </div>
  );
}
