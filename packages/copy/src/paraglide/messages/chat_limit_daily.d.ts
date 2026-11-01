/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Limit_DailyInputs */
/**
* | output |
* | --- |
* | "That's all the assistant can do today. Come back tomorrow, and the lesson will be here." |
*
* @param {Chat_Limit_DailyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_limit_daily: ((inputs?: Chat_Limit_DailyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Limit_DailyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Limit_DailyInputs = {};
