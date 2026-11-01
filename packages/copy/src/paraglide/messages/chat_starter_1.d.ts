/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Starter_1Inputs */
/**
* | output |
* | --- |
* | "A short lesson on equal groups for grade 2." |
*
* @param {Chat_Starter_1Inputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_starter_1: ((inputs?: Chat_Starter_1Inputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Starter_1Inputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Starter_1Inputs = {};
