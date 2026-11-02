/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Col_DayInputs */
/**
* | output |
* | --- |
* | "Day" |
*
* @param {Parent_Col_DayInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_col_day: ((inputs?: Parent_Col_DayInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Col_DayInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Col_DayInputs = {};
