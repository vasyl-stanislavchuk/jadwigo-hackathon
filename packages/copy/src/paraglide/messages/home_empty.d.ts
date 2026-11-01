/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Home_EmptyInputs */
/**
* | output |
* | --- |
* | "There are no lessons here yet." |
*
* @param {Home_EmptyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const home_empty: ((inputs?: Home_EmptyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Home_EmptyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Home_EmptyInputs = {};
