/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Line_Failed_GenericInputs */
/**
* | output |
* | --- |
* | "This step didn't work, I carried on without it" |
*
* @param {Chat_Line_Failed_GenericInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_failed_generic: ((inputs?: Chat_Line_Failed_GenericInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Line_Failed_GenericInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Line_Failed_GenericInputs = {};
