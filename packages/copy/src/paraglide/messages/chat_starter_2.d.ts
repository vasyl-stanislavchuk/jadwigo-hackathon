/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Starter_2Inputs */
/**
* | output |
* | --- |
* | "Adding within 20 for grade 1, 5 questions." |
*
* @param {Chat_Starter_2Inputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_starter_2: ((inputs?: Chat_Starter_2Inputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Starter_2Inputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Starter_2Inputs = {};
