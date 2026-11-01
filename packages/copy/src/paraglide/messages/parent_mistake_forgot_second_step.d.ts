/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Forgot_Second_StepInputs */
/**
* | output |
* | --- |
* | "The second step left out" |
*
* @param {Parent_Mistake_Forgot_Second_StepInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_forgot_second_step: ((inputs?: Parent_Mistake_Forgot_Second_StepInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Forgot_Second_StepInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Forgot_Second_StepInputs = {};
