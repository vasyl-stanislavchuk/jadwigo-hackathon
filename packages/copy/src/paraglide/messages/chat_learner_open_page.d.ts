/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ name: NonNullable<unknown> }} Chat_Learner_Open_PageInputs */
/**
* | output |
* | --- |
* | "Child's page: {name}" |
*
* @param {Chat_Learner_Open_PageInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_learner_open_page: ((inputs: Chat_Learner_Open_PageInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Learner_Open_PageInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Learner_Open_PageInputs = {
    name: NonNullable<unknown>;
};
