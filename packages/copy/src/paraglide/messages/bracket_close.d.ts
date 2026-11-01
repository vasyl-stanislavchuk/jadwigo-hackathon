/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Bracket_CloseInputs */
/**
* | output |
* | --- |
* | "Close bracket" |
*
* @param {Bracket_CloseInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const bracket_close: ((inputs?: Bracket_CloseInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Bracket_CloseInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Bracket_CloseInputs = {};
