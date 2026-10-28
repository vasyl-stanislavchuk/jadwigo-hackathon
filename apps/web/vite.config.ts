// The app's dev server and build. Tailwind 4 compiles Zeszyt's styles (@jadwigo/ui/styles.css).
// The build goes to dist/, which the infra lane uploads to the app bucket.
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { apiTarget, authConfig, webPort } from "./src/config.ts";

// The lesson player calls /api on its own origin; locally the api is another port (src/config.ts).
const proxy = { "/api": { target: apiTarget(), changeOrigin: true } };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The parent's sign-in, or null for none (src/parent/auth.ts).
  define: { __JW_AUTH__: JSON.stringify(authConfig()) },
  // One address everywhere: "localhost" is ::1 alone on macOS, and the Playwright smoke dials 127.0.0.1.
  server: { host: "127.0.0.1", port: webPort(), strictPort: true, proxy },
  preview: { host: "127.0.0.1", port: webPort(), strictPort: true, proxy },
});
