/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Learner_No_GoalsInputs */
/**
* | output |
* | --- |
* | "No goals yet." |
*
* @param {Parent_Learner_No_GoalsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_learner_no_goals: ((inputs?: Parent_Learner_No_GoalsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Learner_No_GoalsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Learner_No_GoalsInputs = {};
