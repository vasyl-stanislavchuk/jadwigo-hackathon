// The site's one read of the environment (lint/*.grit: process.env only in a src/config.ts).

/**
 * SITE_PREVIEW=1 makes a preview build: every listed language and every unreviewed page, written to
 * dist-preview and never deployed. It is how the /en/ twins are checked before English is live
 * (dl-w0b4.81, lead's call on 2026-11-01).
 */
export const sitePreview: boolean = process.env["SITE_PREVIEW"] === "1";
