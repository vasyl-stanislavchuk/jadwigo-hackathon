/**
 * The one place a playground switch (switches.ts) changes the question a page draws: every example
 * passes through `applySwitches` with the page's query, so Try it, Review and Details show the same
 * question under the same switches. A switch at its default leaves the question as written. Every
 * field a switch sets is one packages/contracts already holds.
 */

import type { ChooseData, PlaceData } from "@jadwigo/contracts";
import { querySwitch } from "./route.ts";

/** A question's family and data, the part a switch rewrites. */
interface Drawn {
  family: string;
  data: unknown;
}

export function applySwitches<Q extends Drawn>(question: Q, query: URLSearchParams): Q {
  let out = question;
  // mark: in "mark the numbers you need", every word is tappable, though only the numbers count.
  if (out.family === "choose" && querySwitch(query, "mark") === "words") {
    const data = out.data as ChooseData;
    if (data.layout === "inline") out = { ...out, data: { ...data, tokens: "words" } };
  }
  if (out.family === "place") {
    const data = out.data as PlaceData;
    // clock_hands: a clock to set takes the hands the URL asks for; with no switch it keeps its own.
    if (data.surface === "clock" && query.has("clock_hands")) {
      const hands = querySwitch(query, "clock_hands") === "free" ? "free" : "geared";
      out = { ...out, data: { ...data, hands } };
    }
    // money_total: a running total under the tray.
    if (data.surface === "coins" && querySwitch(query, "money_total") === "shown")
      out = { ...out, data: { ...data, total: "shown" } };
    // area_cells: how the area model's rectangle is drawn.
    const cells = querySwitch(query, "area_cells");
    if (
      data.surface === "grid" &&
      data.split === "one" &&
      query.has("area_cells") &&
      cells !== null
    )
      out = { ...out, data: { ...data, cells: cells as "dots" | "squares" | "open" } };
  }
  return out;
}
