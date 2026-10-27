// The app's dev server and build. Tailwind 4 compiles Zeszyt's styles (@jadwigo/ui/styles.css).
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { webPort } from "./src/config.ts";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: webPort(), strictPort: true },
  preview: { port: webPort(), strictPort: true },
});
