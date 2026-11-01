/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Claim_PreviewInputs */
/**
* | output |
* | --- |
* | "This lesson was a try-out, so it is not saved." |
*
* @param {Parent_Claim_PreviewInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_claim_preview: ((inputs?: Parent_Claim_PreviewInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Claim_PreviewInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Claim_PreviewInputs = {};
