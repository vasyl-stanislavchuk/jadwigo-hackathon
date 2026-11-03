/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Print_Legend_JoinInputs */
/**
* | output |
* | --- |
* | "join" |
*
* @param {Print_Legend_JoinInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const print_legend_join: ((inputs?: Print_Legend_JoinInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Print_Legend_JoinInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Print_Legend_JoinInputs = {};
