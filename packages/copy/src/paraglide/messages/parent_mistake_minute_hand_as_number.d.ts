/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Minute_Hand_As_NumberInputs */
/**
* | output |
* | --- |
* | "The minute hand read as the number on the face" |
*
* @param {Parent_Mistake_Minute_Hand_As_NumberInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_minute_hand_as_number: ((inputs?: Parent_Mistake_Minute_Hand_As_NumberInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Minute_Hand_As_NumberInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Minute_Hand_As_NumberInputs = {};
