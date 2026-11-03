/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Day_TodayInputs */
/**
* | output |
* | --- |
* | "Today" |
*
* @param {Day_TodayInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const day_today: ((inputs?: Day_TodayInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Day_TodayInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Day_TodayInputs = {};
