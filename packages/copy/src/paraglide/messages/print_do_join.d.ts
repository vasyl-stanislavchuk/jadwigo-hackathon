/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Print_Do_JoinInputs */
/**
* | output |
* | --- |
* | "Join the ones that go together with lines." |
*
* @param {Print_Do_JoinInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const print_do_join: ((inputs?: Print_Do_JoinInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Print_Do_JoinInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Print_Do_JoinInputs = {};
