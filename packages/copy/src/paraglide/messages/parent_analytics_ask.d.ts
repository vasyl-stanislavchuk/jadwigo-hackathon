/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Analytics_AskInputs */
/**
* | output |
* | --- |
* | "Jadwigo records how the app is used, including screen recordings without what you type, so we can make it better. Do you agree?" |
*
* @param {Parent_Analytics_AskInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_analytics_ask: ((inputs?: Parent_Analytics_AskInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Analytics_AskInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Analytics_AskInputs = {};
