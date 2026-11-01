/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Bracket_OpenInputs */
/**
* | output |
* | --- |
* | "Open parenthesis" |
*
* @param {Bracket_OpenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const bracket_open: ((inputs?: Bracket_OpenInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Bracket_OpenInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Bracket_OpenInputs = {};
