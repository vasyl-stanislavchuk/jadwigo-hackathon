/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Day_YesterdayInputs */
/**
* | output |
* | --- |
* | "Yesterday" |
*
* @param {Day_YesterdayInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const day_yesterday: ((inputs?: Day_YesterdayInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Day_YesterdayInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Day_YesterdayInputs = {};
