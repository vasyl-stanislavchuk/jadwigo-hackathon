/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Clock_Minute_HandInputs */
/**
* | output |
* | --- |
* | "Minute hand" |
*
* @param {Clock_Minute_HandInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const clock_minute_hand: ((inputs?: Clock_Minute_HandInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Clock_Minute_HandInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Clock_Minute_HandInputs = {};
