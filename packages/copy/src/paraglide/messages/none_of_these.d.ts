/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} None_Of_TheseInputs */
/**
* | output |
* | --- |
* | "None of these" |
*
* @param {None_Of_TheseInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const none_of_these: ((inputs?: None_Of_TheseInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<None_Of_TheseInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type None_Of_TheseInputs = {};
