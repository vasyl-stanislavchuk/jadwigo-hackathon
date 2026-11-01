/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Hour_Hand_Not_MovedInputs */
/**
* | output |
* | --- |
* | "The hour hand left on the hour" |
*
* @param {Parent_Mistake_Hour_Hand_Not_MovedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_hour_hand_not_moved: ((inputs?: Parent_Mistake_Hour_Hand_Not_MovedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Hour_Hand_Not_MovedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Hour_Hand_Not_MovedInputs = {};
