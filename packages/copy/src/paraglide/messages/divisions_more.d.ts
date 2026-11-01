/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Divisions_MoreInputs */
/**
* | output |
* | --- |
* | "More parts" |
*
* @param {Divisions_MoreInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const divisions_more: ((inputs?: Divisions_MoreInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Divisions_MoreInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Divisions_MoreInputs = {};
