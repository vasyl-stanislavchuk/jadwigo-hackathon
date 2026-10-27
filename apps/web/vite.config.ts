// The app's dev server and build. Tailwind 4 compiles Zeszyt's styles (@jadwigo/ui/styles.css).
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { webPort } from "./src/config.ts";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // One address everywhere: "localhost" is ::1 alone on macOS, and the Playwright smoke dials 127.0.0.1.
  server: { host: "127.0.0.1", port: webPort(), strictPort: true },
  preview: { host: "127.0.0.1", port: webPort(), strictPort: true },
});
