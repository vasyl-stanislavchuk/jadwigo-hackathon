/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Twos_MiscountedInputs */
/**
* | output |
* | --- |
* | "The twos counted differently" |
*
* @param {Parent_Mistake_Twos_MiscountedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_twos_miscounted: ((inputs?: Parent_Mistake_Twos_MiscountedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Twos_MiscountedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Twos_MiscountedInputs = {};
