/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ child: NonNullable<unknown> }} Chat_Tool_Learner_Week_AboutInputs */
/**
* | output |
* | --- |
* | "Reading the week · {child}" |
*
* @param {Chat_Tool_Learner_Week_AboutInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_learner_week_about: ((inputs: Chat_Tool_Learner_Week_AboutInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Tool_Learner_Week_AboutInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Tool_Learner_Week_AboutInputs = {
    child: NonNullable<unknown>;
};
