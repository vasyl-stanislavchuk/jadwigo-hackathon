import { type ReactElement, useEffect } from "react";
import { PlaygroundScreen } from "./playground/PlaygroundScreen.tsx";
import { navigate } from "./playground/route.ts";

/** The app's routes. The playground is the only screen today: the lesson player and the parent
 * screens come later, so every other path opens the playground's start page. */
export function App(): ReactElement {
  const inPlayground = window.location.pathname.startsWith("/playground");
  useEffect(() => {
    if (!inPlayground) navigate("/playground", { replace: true });
  }, [inPlayground]);
  return <PlaygroundScreen />;
}
