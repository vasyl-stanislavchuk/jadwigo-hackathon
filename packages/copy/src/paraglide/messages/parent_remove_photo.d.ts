/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Remove_PhotoInputs */
/**
* | output |
* | --- |
* | "Remove the photo" |
*
* @param {Parent_Remove_PhotoInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_remove_photo: ((inputs?: Parent_Remove_PhotoInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Remove_PhotoInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Remove_PhotoInputs = {};
