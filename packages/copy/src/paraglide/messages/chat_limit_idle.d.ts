/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Limit_IdleInputs */
/**
* | output |
* | --- |
* | "The conversation waited a long time, so the turn ended. Write to carry on." |
*
* @param {Chat_Limit_IdleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_limit_idle: ((inputs?: Chat_Limit_IdleInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Limit_IdleInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Limit_IdleInputs = {};
