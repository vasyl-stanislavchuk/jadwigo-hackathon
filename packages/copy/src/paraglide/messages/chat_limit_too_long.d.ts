/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Limit_Too_LongInputs */
/**
* | output |
* | --- |
* | "This turn ran too long, so it stopped. The lesson so far is saved: say what to do next." |
*
* @param {Chat_Limit_Too_LongInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_limit_too_long: ((inputs?: Chat_Limit_Too_LongInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Limit_Too_LongInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Limit_Too_LongInputs = {};
