/**
 * The playground: every question type as a question type of one of seven interaction families, for
 * the owner rather than a learner. One shell (shell/Shell.tsx): navigation on the left, the view in
 * the middle, its controls on the right. The URL scheme is in route.ts.
 *
 *   the start page (views/StartPage)  ·  a question type (views/FamilyPage: Try it, Review,
 *   Details)  ·  the System page (views/system/SystemPage)
 *
 * Nothing is judged and nothing is stored: every state a page shows is written in an example's
 * scenarios (examples/).
 */

import { familyInfo, questionTypesOf } from "@jadwigo/lesson-kit";
import { type ReactElement, useEffect } from "react";
import "./tool/neutral.css";
import { linkTo, type PlaygroundRoute, playgroundRoute, useLocation } from "./route.ts";
import { type Crumb, Shell } from "./shell/Shell.tsx";
import { FamilyPage } from "./views/FamilyPage.tsx";
import { StartPage } from "./views/StartPage.tsx";
import { SystemPage } from "./views/system/SystemPage.tsx";

function Missing({ what }: { what: string }): ReactElement {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-2 p-8">
      <p className="text-lg font-medium">{what}</p>
      <p className="text-muted-foreground">
        Pick a family on the left, or go back to the start page.
      </p>
    </div>
  );
}

/** The view for a route, and where it sits for the header. */
function view(route: PlaygroundRoute | null): {
  crumbs: Crumb[];
  body: ReactElement;
  controls?: boolean;
} {
  const home: Crumb = { label: "Playground", href: linkTo("/playground") };
  if (route === null)
    return {
      crumbs: [home, { label: "Not found" }],
      body: <Missing what="No family or question type at this address." />,
      controls: false,
    };
  if (route.family === null)
    return { crumbs: [{ label: "Playground" }], body: <StartPage />, controls: false };
  const type = questionTypesOf(route.family).find((p) => p.name === route.question_type);
  return {
    crumbs: [
      home,
      { label: familyInfo(route.family).label },
      { label: type?.label ?? "First question type" },
    ],
    body: <FamilyPage key={route.family} family={route.family} route={route} />,
  };
}

export function PlaygroundScreen(): ReactElement {
  const { path } = useLocation();
  // The tools are neutral; only the lesson takes a theme (tool/neutral.css).
  useEffect(() => {
    document.documentElement.setAttribute("data-playground", "");
    return () => document.documentElement.removeAttribute("data-playground");
  }, []);
  const route = playgroundRoute(path);
  // The System page draws in Zeszyt itself, so it skips the neutral shell.
  if (route?.page === "system") return <SystemPage />;
  const { crumbs, body, controls } = view(route);
  return (
    <Shell crumbs={crumbs} controls={controls ?? true}>
      {body}
    </Shell>
  );
}
