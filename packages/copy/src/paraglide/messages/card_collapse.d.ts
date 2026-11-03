/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Card_CollapseInputs */
/**
* | output |
* | --- |
* | "Collapse lesson" |
*
* @param {Card_CollapseInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const card_collapse: ((inputs?: Card_CollapseInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Card_CollapseInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Card_CollapseInputs = {};
