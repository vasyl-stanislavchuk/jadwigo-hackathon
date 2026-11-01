/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Link_CopiedInputs */
/**
* | output |
* | --- |
* | "Copied. Paste it into your browser." |
*
* @param {Parent_Link_CopiedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_link_copied: ((inputs?: Parent_Link_CopiedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Link_CopiedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Link_CopiedInputs = {};
