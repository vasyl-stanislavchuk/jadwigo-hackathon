/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Limit_IdleInputs */
/**
* | output |
* | --- |
* | "The wait for the next step ran too long, so the turn ended. The lesson so far is saved: say what to do next." |
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
