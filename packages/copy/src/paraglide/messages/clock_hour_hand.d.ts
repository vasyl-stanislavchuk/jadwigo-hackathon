/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Clock_Hour_HandInputs */
/**
* | output |
* | --- |
* | "Hour hand" |
*
* @param {Clock_Hour_HandInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const clock_hour_hand: ((inputs?: Clock_Hour_HandInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Clock_Hour_HandInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Clock_Hour_HandInputs = {};
