/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Stopped_BeforeInputs */
/**
* | output |
* | --- |
* | "Stopped." |
*
* @param {Chat_Stopped_BeforeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_stopped_before: ((inputs?: Chat_Stopped_BeforeInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Stopped_BeforeInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Stopped_BeforeInputs = {};
