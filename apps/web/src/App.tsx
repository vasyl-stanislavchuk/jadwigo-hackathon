import type { ReactElement } from "react";
import { useEffect } from "react";
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
 *   /playground/...    the question-type gallery, at an unlisted path (decision
 *                      2026-10-28-the-question-type-gallery-ships-at-app-jadwigo-pl-playground-wit)
 *
 * Any other path opens the featured lesson too.
 */
export function App(): ReactElement | null {
  const { path, query } = useLocation();
  const inPlayground = path.startsWith("/playground");
  const play = inPlayground ? null : playRoute(path);
  useEffect(() => {
    if (!inPlayground && play === null) {
      const search = window.location.search;
      navigate(`${playPath(featuredAssignment())}${search}`, { replace: true });
    }
  }, [inPlayground, play]);
  if (inPlayground) return <PlaygroundScreen />;
  if (play === null) return null;
  const language = queryLanguage(query) ?? "pl";
  if (play.assignmentId === null) return <LessonNotFound language={language} />;
  return (
    <PlayScreen key={play.assignmentId} assignmentId={play.assignmentId} language={language} />
  );
}
