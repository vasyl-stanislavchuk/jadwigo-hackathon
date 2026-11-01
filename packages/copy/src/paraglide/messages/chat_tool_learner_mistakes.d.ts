/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Tool_Learner_MistakesInputs */
/**
* | output |
* | --- |
* | "Reading what the learner found tricky" |
*
* @param {Chat_Tool_Learner_MistakesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_learner_mistakes: ((inputs?: Chat_Tool_Learner_MistakesInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Tool_Learner_MistakesInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Tool_Learner_MistakesInputs = {};
