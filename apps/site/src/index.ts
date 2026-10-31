import { hosts } from "@jadwigo/config";

/** The host this app serves in prod. */
export const servedHost = hosts.prod.site;

/** The app's front page, which lists and plays the featured lessons without a login (dl-e8ov.2.41). */
export const appUrl = `https://${hosts.prod.app}/`;

/** The parent's sign-in, which also registers: the email code, then Google, then Facebook (dl-e8ov.2.51). */
export const parentUrl = `${appUrl}parent`;
