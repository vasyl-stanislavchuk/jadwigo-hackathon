/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Object_LearnerInputs */
/**
* | output |
* | --- |
* | "Child" |
*
* @param {Chat_Object_LearnerInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_object_learner: ((inputs?: Chat_Object_LearnerInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Object_LearnerInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Object_LearnerInputs = {};
