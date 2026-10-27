// Placeholder until the question type page lands (Try it, Review, Details on the written examples).
import type { FamilyName } from "@jadwigo/lesson-kit";
import type { ReactElement } from "react";
import type { PlaygroundRoute } from "../route.ts";

export function FamilyPage({
  family,
}: {
  family: FamilyName;
  route: PlaygroundRoute;
}): ReactElement {
  return <div data-family-page={family} />;
}
