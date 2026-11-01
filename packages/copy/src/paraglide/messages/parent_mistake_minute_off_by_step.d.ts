/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Minute_Off_By_StepInputs */
/**
* | output |
* | --- |
* | "The minute hand one mark away" |
*
* @param {Parent_Mistake_Minute_Off_By_StepInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_minute_off_by_step: ((inputs?: Parent_Mistake_Minute_Off_By_StepInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Minute_Off_By_StepInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Minute_Off_By_StepInputs = {};
