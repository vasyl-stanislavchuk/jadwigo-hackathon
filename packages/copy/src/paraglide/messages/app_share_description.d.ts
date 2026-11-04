/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} App_Share_DescriptionInputs */
/**
* | output |
* | --- |
* | "A short math or Polish lesson for grades 1–3, in the browser, with no sign-in. No points, timers or ads." |
*
* @param {App_Share_DescriptionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const app_share_description: ((inputs?: App_Share_DescriptionInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<App_Share_DescriptionInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type App_Share_DescriptionInputs = {};
