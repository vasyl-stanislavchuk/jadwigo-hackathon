/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Ai_OffInputs */
/**
* | output |
* | --- |
* | "Without it, Jadwigo AI makes no new lessons. You can give it at any time." |
*
* @param {Parent_Ai_OffInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_ai_off: ((inputs?: Parent_Ai_OffInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Ai_OffInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Ai_OffInputs = {};
