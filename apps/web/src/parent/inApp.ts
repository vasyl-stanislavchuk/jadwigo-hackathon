/**
 * Whether the page is open in Facebook's, Messenger's or Instagram's own browser (dl-e8ov.2.63).
 * Google refuses a sign-in inside an embedded browser (403 disallowed_useragent), and parents share
 * links in those apps, so there /parent offers no Google button: a line and the link to open in the
 * phone's browser instead. Facebook's own sign-in and the email code work there.
 *
 * The apps name themselves in the user agent: FBAN and FBAV (Facebook on iOS), FB_IAB (Facebook and
 * Messenger on Android), Messenger (Messenger on iOS), Instagram.
 */
const IN_APP = /\b(?:FBAN|FBAV|FB_IAB|Messenger|Instagram)\b/;

export function inAppBrowser(userAgent: string): boolean {
  return IN_APP.test(userAgent);
}
