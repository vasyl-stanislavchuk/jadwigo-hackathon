// The app's dev server and build. Tailwind 4 compiles Zeszyt's styles (@jadwigo/ui/styles.css).
// The build goes to dist/, which the infra lane uploads to the app bucket.
import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { builderPlugin } from "./dev/builder-plugin.ts";
import { enginePlugin } from "./dev/engine-plugin.ts";
import { apiTarget, authConfig, webPort } from "./src/config.ts";
import { devMediaUrl, NO_MEDIA_URL } from "./src/media.ts";

// The lesson player calls /api on its own origin; locally the api is another port (src/config.ts).
const proxy = { "/api": { target: apiTarget(), changeOrigin: true } };

// A picture ref as a same-origin path: what media.ts leaves with no media URL (`/<sha>.<ext>`) and
// the prototype's spelling (`/media/khan/<sha>.<ext>`). The ref is media.ts's REF.
const PICTURE_PATH = /^\/(?:media\/khan\/)?[0-9a-f]{40,64}\.[a-z0-9]{2,5}$/;

/**
 * The dev server's guard for pictures (dl-5ssh.97). A picture ref that reaches it as a path
 * never became a media URL, and Vite's SPA fallback would answer it with index.html, a silent
 * broken picture: it answers 404 with the reason instead. With no media URL it also says so in
 * the terminal and in the page's console.
 */
function mediaGuard(media: string): Plugin {
  return {
    name: "jadwigo-media-guard",
    apply: "serve",
    configureServer(server) {
      if (!media) server.config.logger.warn(NO_MEDIA_URL);
      server.middlewares.use((req, res, next) => {
        if (!PICTURE_PATH.test(req.url?.split("?")[0] ?? "")) return next();
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(
          media
            ? `A picture ref reached the dev server: it is served from ${media}, never from here.`
            : NO_MEDIA_URL,
        );
      });
    },
    transformIndexHtml: () =>
      media ? [] : [{ tag: "script", children: `console.warn(${JSON.stringify(NO_MEDIA_URL)})` }],
  };
}

export default defineConfig(({ command, mode }) => {
  // In dev, an unset VITE_MEDIA_URL takes .env.example's, so a fresh checkout's pictures load. The
  // build takes only what it is given: the app's deploy sets it.
  const media =
    command === "serve"
      ? devMediaUrl(
          loadEnv(mode, import.meta.dirname, "VITE_")["VITE_MEDIA_URL"],
          readFileSync(new URL("./.env.example", import.meta.url), "utf8"),
        )
      : undefined;
  return {
    // The lesson builder's and the AI engine's dev-server sides apply on `serve` only
    // (dev/builder-plugin.ts, dl-a38n; dev/engine-plugin.ts, dl-z5ja).
    plugins: [
      react(),
      tailwindcss(),
      builderPlugin(),
      enginePlugin(),
      ...(media === undefined ? [] : [mediaGuard(media)]),
    ],
    define: {
      // The parent's sign-in, or null for none (src/parent/auth.ts).
      __JW_AUTH__: JSON.stringify(authConfig()),
      ...(media === undefined ? {} : { "import.meta.env.VITE_MEDIA_URL": JSON.stringify(media) }),
    },
    // One address everywhere: "localhost" is ::1 alone on macOS, and the Playwright smoke dials 127.0.0.1.
    server: { host: "127.0.0.1", port: webPort(), strictPort: true, proxy },
    preview: { host: "127.0.0.1", port: webPort(), strictPort: true, proxy },
  };
});
