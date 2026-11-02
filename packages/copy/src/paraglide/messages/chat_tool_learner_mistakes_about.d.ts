/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ child: NonNullable<unknown> }} Chat_Tool_Learner_Mistakes_AboutInputs */
/**
* | output |
* | --- |
* | "Reading what was tricky · {child}" |
*
* @param {Chat_Tool_Learner_Mistakes_AboutInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_learner_mistakes_about: ((inputs: Chat_Tool_Learner_Mistakes_AboutInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Tool_Learner_Mistakes_AboutInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Tool_Learner_Mistakes_AboutInputs = {
    child: NonNullable<unknown>;
};
