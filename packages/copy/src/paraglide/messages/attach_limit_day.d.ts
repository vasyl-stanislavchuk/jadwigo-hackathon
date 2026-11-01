/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Attach_Limit_DayInputs */
/**
* | output |
* | --- |
* | "That is all the photos for today. You can add more tomorrow" |
*
* @param {Attach_Limit_DayInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_limit_day: ((inputs?: Attach_Limit_DayInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Attach_Limit_DayInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Attach_Limit_DayInputs = {};
