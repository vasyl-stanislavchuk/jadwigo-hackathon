/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ child: NonNullable<unknown> }} Chat_Tool_Learner_Skills_AboutInputs */
/**
* | output |
* | --- |
* | "Reading the goals · {child}" |
*
* @param {Chat_Tool_Learner_Skills_AboutInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_learner_skills_about: ((inputs: Chat_Tool_Learner_Skills_AboutInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Tool_Learner_Skills_AboutInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Tool_Learner_Skills_AboutInputs = {
    child: NonNullable<unknown>;
};
