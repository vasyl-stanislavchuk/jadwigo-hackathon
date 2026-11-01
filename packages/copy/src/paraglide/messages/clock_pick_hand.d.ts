/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Clock_Pick_HandInputs */
/**
* | output |
* | --- |
* | "Which hand are you moving?" |
*
* @param {Clock_Pick_HandInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const clock_pick_hand: ((inputs?: Clock_Pick_HandInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Clock_Pick_HandInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Clock_Pick_HandInputs = {};
