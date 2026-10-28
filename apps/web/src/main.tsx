import "@jadwigo/ui/styles.css";
import { followSystemTheme } from "@jadwigo/ui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";

followSystemTheme(document.documentElement, window);

const root = document.getElementById("root");
if (root === null) throw new Error("index.html has no #root");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
