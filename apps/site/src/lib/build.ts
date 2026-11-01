// Which kind of build this is (dl-w0b4.81). A strict build is the one that is deployed: `astro build`
// without SITE_PREVIEW. It serves only live languages and reviewed pages. Dev and the preview build
// (SITE_PREVIEW=1 astro build --outDir dist-preview) serve everything, so drafts can be checked.
import { sitePreview } from "../config.ts";

export const strictBuild: boolean = import.meta.env.PROD && !sitePreview;
