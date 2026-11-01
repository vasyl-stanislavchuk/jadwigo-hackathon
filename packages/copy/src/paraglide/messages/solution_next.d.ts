/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Solution_NextInputs */
/**
* | output |
* | --- |
* | "Next step" |
*
* @param {Solution_NextInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const solution_next: ((inputs?: Solution_NextInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Solution_NextInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Solution_NextInputs = {};
