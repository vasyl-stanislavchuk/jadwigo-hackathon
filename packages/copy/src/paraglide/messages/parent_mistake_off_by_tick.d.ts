/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Off_By_TickInputs */
/**
* | output |
* | --- |
* | "One mark away on the line" |
*
* @param {Parent_Mistake_Off_By_TickInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_off_by_tick: ((inputs?: Parent_Mistake_Off_By_TickInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Off_By_TickInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Off_By_TickInputs = {};
