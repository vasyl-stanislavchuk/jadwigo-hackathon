/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Incomplete_GroupInputs */
/**
* | output |
* | --- |
* | "Place the cards that are left too." |
*
* @param {Incomplete_GroupInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const incomplete_group: ((inputs?: Incomplete_GroupInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Incomplete_GroupInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Incomplete_GroupInputs = {};
