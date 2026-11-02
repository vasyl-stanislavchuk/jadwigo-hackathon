import "@jadwigo/ui/styles.css";
import { followSystemTheme } from "@jadwigo/ui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { startAppAnalytics } from "./analytics/start.ts";

followSystemTheme(document.documentElement, window);
// PostHog, once, never on the owner's playground; nothing is captured before a parent's yes.
void startAppAnalytics(window.location.pathname);

const root = document.getElementById("root");
if (root === null) throw new Error("index.html has no #root");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
