/**
 * What a link to the app shows when it is pasted into a chat (dl-w0b4.128): the Jadwigo name, a
 * line on what it is, and the app icon. The page is a single-page app, and a link preview never runs
 * its script, so these go into index.html at build time (vite.config.ts). A lesson's own title in
 * its preview needs the server to fill it per lesson (dl-5ssh.155).
 */

import { hosts } from "@jadwigo/config";
import { copy } from "@jadwigo/copy";

/** A tag in the head of index.html, the shape Vite's transformIndexHtml takes. */
export interface ShareTag {
  tag: "meta";
  attrs: Record<string, string>;
  injectTo: "head";
}

const NAME = "Jadwigo";
/** The 512 px app icon, written to public/ by tools/src/brand-icons.ts. */
const ICON = { path: "/icon-512.png", size: "512" };

/** The share tags for the app's index.html, which speaks Polish (`<html lang="pl">`). */
export function shareTags(): ShareTag[] {
  const description = copy("pl", "app_share_description");
  const image = `https://${hosts.prod.app}${ICON.path}`;
  const named = (name: string, content: string): ShareTag => ({
    tag: "meta",
    attrs: { name, content },
    injectTo: "head",
  });
  const property = (prop: string, content: string): ShareTag => ({
    tag: "meta",
    attrs: { property: prop, content },
    injectTo: "head",
  });
  return [
    named("description", description),
    property("og:type", "website"),
    property("og:site_name", NAME),
    property("og:locale", "pl_PL"),
    property("og:title", NAME),
    property("og:description", description),
    property("og:image", image),
    property("og:image:width", ICON.size),
    property("og:image:height", ICON.size),
    property("og:image:alt", NAME),
    named("twitter:card", "summary"),
    named("twitter:title", NAME),
    named("twitter:description", description),
    named("twitter:image", image),
  ];
}
