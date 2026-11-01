/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Play_Summary_SomeInputs */
/**
* | output |
* | --- |
* | "Some of these we will practise again. See what the right answers look like." |
*
* @param {Play_Summary_SomeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_summary_some: ((inputs?: Play_Summary_SomeInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Play_Summary_SomeInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Play_Summary_SomeInputs = {};
