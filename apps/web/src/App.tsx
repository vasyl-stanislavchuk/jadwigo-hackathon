import type { ReactElement } from "react";
import { useEffect } from "react";
import { ParentScreen } from "./parent/ParentScreen.tsx";
import { PARENT_PATH } from "./parent/route.ts";
import { HomeScreen } from "./play/HomeScreen.tsx";
import { LessonNotFound, PlayScreen } from "./play/PlayScreen.tsx";
import { playRoute } from "./play/route.ts";
import { PlaygroundScreen } from "./playground/PlaygroundScreen.tsx";
import { navigate, queryLanguage, useLocation } from "./playground/route.ts";

/**
 * The app's routes (dl-5ssh.3.1, dl-5ssh.3.6):
 *
 *   /                  the featured lessons, each a link to its player, with no login
 *   /play/<id>         the lesson player
 *   /parent            the parent's sign-in and home (dl-e8ov.2.38)
 *   /playground/...    the question-type gallery, at an unlisted path (decision
 *                      2026-10-28-the-question-type-gallery-ships-at-app-jadwigo-pl-playground-wit)
 *
 * Any other path goes to /.
 */
export function App(): ReactElement | null {
  const { path, query } = useLocation();
  const inPlayground = path.startsWith("/playground");
  const inParent = path === PARENT_PATH || path === `${PARENT_PATH}/`;
  const home = path === "/";
  const play = inPlayground || inParent || home ? null : playRoute(path);
  const elsewhere = !inPlayground && !inParent && !home && play === null;
  useEffect(() => {
    if (elsewhere) navigate(`/${window.location.search}`, { replace: true });
  }, [elsewhere]);
  if (inPlayground) return <PlaygroundScreen />;
  const language = queryLanguage(query) ?? "pl";
  if (inParent) return <ParentScreen language={language} query={query} />;
  if (home) return <HomeScreen language={language} query={query} />;
  if (play === null) return null;
  if (play.assignmentId === null) return <LessonNotFound language={language} />;
  return (
    <PlayScreen key={play.assignmentId} assignmentId={play.assignmentId} language={language} />
  );
}
