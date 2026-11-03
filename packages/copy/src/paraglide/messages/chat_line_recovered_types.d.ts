/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Line_Recovered_TypesInputs */
/**
* | output |
* | --- |
* | "Couldn't check the question types, so I built the lesson without them" |
*
* @param {Chat_Line_Recovered_TypesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_recovered_types: ((inputs?: Chat_Line_Recovered_TypesInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Line_Recovered_TypesInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Line_Recovered_TypesInputs = {};
