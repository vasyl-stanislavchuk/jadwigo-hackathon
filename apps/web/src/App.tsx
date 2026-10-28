import type { ReactElement } from "react";
import { useEffect } from "react";
import { ParentScreen } from "./parent/ParentScreen.tsx";
import { PARENT_PATH } from "./parent/route.ts";
import { featuredAssignment } from "./play/featured.ts";
import { LessonNotFound, PlayScreen } from "./play/PlayScreen.tsx";
import { playPath, playRoute } from "./play/route.ts";
import { PlaygroundScreen } from "./playground/PlaygroundScreen.tsx";
import { navigate, queryLanguage, useLocation } from "./playground/route.ts";

/**
 * The app's routes (dl-5ssh.3.1):
 *
 *   /                  opens the featured lesson, with no login
 *   /play/<id>         the lesson player
 *   /parent            the parent's sign-in and home (dl-e8ov.2.38)
 *   /playground/...    the question-type gallery, at an unlisted path (decision
 *                      2026-10-28-the-question-type-gallery-ships-at-app-jadwigo-pl-playground-wit)
 *
 * Any other path opens the featured lesson too.
 */
export function App(): ReactElement | null {
  const { path, query } = useLocation();
  const inPlayground = path.startsWith("/playground");
  const inParent = path === PARENT_PATH || path === `${PARENT_PATH}/`;
  const play = inPlayground || inParent ? null : playRoute(path);
  useEffect(() => {
    if (!inPlayground && !inParent && play === null) {
      const search = window.location.search;
      navigate(`${playPath(featuredAssignment())}${search}`, { replace: true });
    }
  }, [inPlayground, inParent, play]);
  if (inPlayground) return <PlaygroundScreen />;
  const language = queryLanguage(query) ?? "pl";
  if (inParent) return <ParentScreen language={language} query={query} />;
  if (play === null) return null;
  if (play.assignmentId === null) return <LessonNotFound language={language} />;
  return (
    <PlayScreen key={play.assignmentId} assignmentId={play.assignmentId} language={language} />
  );
}
