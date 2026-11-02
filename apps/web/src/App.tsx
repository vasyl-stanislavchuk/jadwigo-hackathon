import { setAudience } from "@jadwigo/ui";
import { lazy, type ReactElement, Suspense, useEffect } from "react";
import { ConsentBanner } from "./analytics/ConsentBanner.tsx";
import { useDocumentLang, useScreenLanguage } from "./nav/language.ts";
import { navigate, useLocation } from "./nav/location.ts";
import { ConsentScreen } from "./oauth/ConsentScreen.tsx";
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
 *   /oauth/consent     a parent lets their own AI app connect Jadwigo's MCP (dl-1u6fn.7)
 *   /playground/...    the question-type gallery, at an unlisted path, loaded on demand (decision
 *                      2026-10-28-the-question-type-gallery-ships-at-app-jadwigo-pl-playground-wit)
 *
 * Any other path goes to /.
 *
 * The screens speak ?lang, then the parent's pick, then the pod's language, then Polish
 * (nav/language.ts, dl-uukj.33), and <html lang> says which.
 */
// The playground is the owner's tool at an unlisted path: its code, its System page and its
// neutral stylesheet load only when the path is /playground (dl-uukj.32 wave 2 step 0).
const PlaygroundScreen = lazy(() =>
  import("./playground/PlaygroundScreen.tsx").then((m) => ({ default: m.PlaygroundScreen })),
);

/** Where Supabase Auth's oauth_server_authorization_path sends a parent (docs/research/mcp-oauth.md). */
const CONSENT_PATH = "/oauth/consent";

export function App(): ReactElement | null {
  const { path, query } = useLocation();
  const inPlayground = path.startsWith("/playground");
  const inParent = isParentPath(path);
  const consent = path === CONSENT_PATH;
  const home = path === "/";
  const play = inPlayground || inParent || consent || home ? null : playRoute(path);
  const elsewhere = !inPlayground && !inParent && !consent && !home && play === null;
  const language = useScreenLanguage(query);
  useDocumentLang(language);
  useEffect(() => {
    if (elsewhere) navigate(`/${window.location.search}`, { replace: true });
  }, [elsewhere]);
  // The parent's pages speak to an adult, the rest to a child (dl-uukj.47.67): <html data-audience>
  // picks the look in foundation.css. The playground is the owner's tool and keeps the child's.
  const adult = inParent || consent;
  useEffect(() => {
    setAudience(document.documentElement, adult ? "adult" : "kid");
  }, [adult]);
  if (inPlayground)
    return (
      <Suspense fallback={null}>
        <PlaygroundScreen />
      </Suspense>
    );
  if (inParent)
    return (
      <>
        <ParentScreen language={language} query={query} />
        <ConsentBanner language={language} />
      </>
    );
  if (consent) return <ConsentScreen language={language} query={query} />;
  if (home) return <HomeScreen language={language} query={query} />;
  if (play === null) return null;
  if (play.assignmentId === null) return <LessonNotFound language={language} />;
  return (
    <PlayScreen key={play.assignmentId} assignmentId={play.assignmentId} language={language} />
  );
}
