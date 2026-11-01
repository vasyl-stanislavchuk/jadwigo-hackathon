/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Learner_Nothing_RecordedInputs */
/**
* | output |
* | --- |
* | "Nothing recorded yet." |
*
* @param {Parent_Learner_Nothing_RecordedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_learner_nothing_recorded: ((inputs?: Parent_Learner_Nothing_RecordedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Learner_Nothing_RecordedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Learner_Nothing_RecordedInputs = {};
