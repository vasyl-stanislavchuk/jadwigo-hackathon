/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Wrong_DirectionInputs */
/**
* | output |
* | --- |
* | "Counted from the other end of the line" |
*
* @param {Parent_Mistake_Wrong_DirectionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_wrong_direction: ((inputs?: Parent_Mistake_Wrong_DirectionInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Wrong_DirectionInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Wrong_DirectionInputs = {};
