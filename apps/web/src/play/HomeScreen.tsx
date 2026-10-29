/**
 * The home page at / (dl-5ssh.3.6), with no login: the featured lessons from
 * GET /api/v1/featured-lessons, oldest first, each a big link to /play/<assignment>. The page's
 * query (?lang) rides along on each link.
 */

import { createClient, type FeaturedClient } from "@jadwigo/api-client";
import type { FeaturedLesson } from "@jadwigo/contracts";
import { copy, type Language } from "@jadwigo/copy";
import { LessonTheme } from "@jadwigo/lesson-kit";
import { Button, Spinner } from "@jadwigo/ui";
import { type ReactElement, type ReactNode, useEffect, useMemo, useState } from "react";
import { NavLink } from "../nav/NavLink.tsx";
import { playPath } from "./route.ts";

/** The kid page the player draws too (PlayScreen.tsx), kept apart from the player's own files. */
function KidPage({ children }: { children: ReactNode }): ReactElement {
  return (
    <main className="kid-page" data-learner-view data-play>
      <LessonTheme>{children}</LessonTheme>
    </main>
  );
}

function Message({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-6 p-6 text-2xl">{children}</div>
  );
}

type Home = { kind: "loading" } | { kind: "ready"; lessons: FeaturedLesson[] } | { kind: "failed" };

export function HomeScreen({
  language,
  query,
  client,
}: {
  language: Language;
  /** The page's query, carried onto each lesson's link. */
  query: URLSearchParams;
  /** The API, for tests; the page's own origin when absent. */
  client?: FeaturedClient;
}): ReactElement {
  const api = useMemo(() => client ?? createClient({ base: "" }), [client]);
  const [home, setHome] = useState<Home>({ kind: "loading" });
  useEffect(() => {
    let live = true;
    api.featuredLessons().then(
      ({ lessons }) => {
        if (live) setHome({ kind: "ready", lessons });
      },
      () => {
        if (live) setHome({ kind: "failed" });
      },
    );
    return () => {
      live = false;
    };
  }, [api]);
  const search = query.size > 0 ? `?${query}` : "";
  switch (home.kind) {
    case "loading":
      return (
        <KidPage>
          <Message>
            <Spinner label={copy(language, "loading")} />
            <p>{copy(language, "loading")}</p>
          </Message>
        </KidPage>
      );
    case "failed":
      return (
        <KidPage>
          <Message>
            <p data-failed>{copy(language, "load_failed")}</p>
          </Message>
        </KidPage>
      );
    case "ready":
      return (
        <KidPage>
          <Message>
            <h1 className="text-3xl font-bold">{copy(language, "home_title")}</h1>
            {home.lessons.length === 0 ? (
              <p data-home-empty>{copy(language, "home_empty")}</p>
            ) : (
              <ul className="flex w-full flex-col gap-4" data-featured>
                {home.lessons.map((lesson) => (
                  <li key={lesson.assignment_id}>
                    <Button
                      asChild
                      size="commit"
                      className="kid-action w-full justify-start text-left text-2xl whitespace-normal"
                    >
                      <NavLink
                        href={`${playPath(lesson.assignment_id)}${search}`}
                        lang={lesson.language}
                        data-lesson={lesson.assignment_id}
                      >
                        {lesson.title}
                      </NavLink>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Message>
        </KidPage>
      );
  }
}
