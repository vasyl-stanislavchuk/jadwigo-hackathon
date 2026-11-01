/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} True_Or_FalseInputs */
/**
* | output |
* | --- |
* | "True or false?" |
*
* @param {True_Or_FalseInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const true_or_false: ((inputs?: True_Or_FalseInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<True_Or_FalseInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type True_Or_FalseInputs = {};
