import { hosts } from "@jadwigo/config";

/** The host this app serves in prod. */
export const servedHost = hosts.prod.site;

/** Where the placeholder's one link goes: the app, whose front page plays the featured lesson (dl-e8ov.2.41). */
export const appUrl = `https://${hosts.prod.app}/`;
