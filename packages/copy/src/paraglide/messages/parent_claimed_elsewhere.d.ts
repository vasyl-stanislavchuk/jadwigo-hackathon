/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Claimed_ElsewhereInputs */
/**
* | output |
* | --- |
* | "This lesson is already saved on another account." |
*
* @param {Parent_Claimed_ElsewhereInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_claimed_elsewhere: ((inputs?: Parent_Claimed_ElsewhereInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Claimed_ElsewhereInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Claimed_ElsewhereInputs = {};
