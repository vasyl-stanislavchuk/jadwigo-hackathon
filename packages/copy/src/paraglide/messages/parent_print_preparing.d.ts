/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Print_PreparingInputs */
/**
* | output |
* | --- |
* | "Preparing the sheet…" |
*
* @param {Parent_Print_PreparingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_print_preparing: ((inputs?: Parent_Print_PreparingInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Print_PreparingInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Print_PreparingInputs = {};
