/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ name: NonNullable<unknown> }} Chat_Learner_OpenInputs */
/**
* | output |
* | --- |
* | "Details: {name}" |
*
* @param {Chat_Learner_OpenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_learner_open: ((inputs: Chat_Learner_OpenInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Learner_OpenInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Learner_OpenInputs = {
    name: NonNullable<unknown>;
};
