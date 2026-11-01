/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Copy_LinkInputs */
/**
* | output |
* | --- |
* | "Copy the link" |
*
* @param {Parent_Copy_LinkInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_copy_link: ((inputs?: Parent_Copy_LinkInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Copy_LinkInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Copy_LinkInputs = {};
