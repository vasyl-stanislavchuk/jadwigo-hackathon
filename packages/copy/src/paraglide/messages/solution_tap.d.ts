/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Solution_TapInputs */
/**
* | output |
* | --- |
* | "Now tap the letter from the solution." |
*
* @param {Solution_TapInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const solution_tap: ((inputs?: Solution_TapInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Solution_TapInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Solution_TapInputs = {};
