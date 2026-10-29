import { lazy, type ReactElement, Suspense, useEffect } from "react";
import { navigate, queryLanguage, useLocation } from "./nav/location.ts";
import { ParentScreen } from "./parent/ParentScreen.tsx";
import { isParentPath } from "./parent/route.ts";
import { HomeScreen } from "./play/HomeScreen.tsx";
import { LessonNotFound, PlayScreen } from "./play/PlayScreen.tsx";
import { playRoute } from "./play/route.ts";

/**
 * The app's routes (dl-5ssh.3.1, dl-5ssh.3.6):
 *
 *   /                  the featured lessons, each a link to its player, with no login
 *   /play/<id>         the lesson player
 *   /parent            the parent's sign-in and home (dl-e8ov.2.38)
 *   /parent/attempts/<id>  one finished lesson for the parent (dl-uukj.30.2)
 *   /playground/...    the question-type gallery, at an unlisted path, loaded on demand (decision
 *                      2026-10-28-the-question-type-gallery-ships-at-app-jadwigo-pl-playground-wit)
 *
 * Any other path goes to /.
 */
// The playground is the owner's tool at an unlisted path: its code, its System page and its
// neutral stylesheet load only when the path is /playground (dl-uukj.32 wave 2 step 0).
const PlaygroundScreen = lazy(() =>
  import("./playground/PlaygroundScreen.tsx").then((m) => ({ default: m.PlaygroundScreen })),
);

export function App(): ReactElement | null {
  const { path, query } = useLocation();
  const inPlayground = path.startsWith("/playground");
  const inParent = isParentPath(path);
  const home = path === "/";
  const play = inPlayground || inParent || home ? null : playRoute(path);
  const elsewhere = !inPlayground && !inParent && !home && play === null;
  useEffect(() => {
    if (elsewhere) navigate(`/${window.location.search}`, { replace: true });
  }, [elsewhere]);
  if (inPlayground)
    return (
      <Suspense fallback={null}>
        <PlaygroundScreen />
      </Suspense>
    );
  const language = queryLanguage(query) ?? "pl";
  if (inParent) return <ParentScreen language={language} query={query} />;
  if (home) return <HomeScreen language={language} query={query} />;
  if (play === null) return null;
  if (play.assignmentId === null) return <LessonNotFound language={language} />;
  return (
    <PlayScreen key={play.assignmentId} assignmentId={play.assignmentId} language={language} />
  );
}
