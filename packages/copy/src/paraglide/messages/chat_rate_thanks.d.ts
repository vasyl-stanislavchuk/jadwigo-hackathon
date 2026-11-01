/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Rate_ThanksInputs */
/**
* | output |
* | --- |
* | "Thank you, your rating is saved." |
*
* @param {Chat_Rate_ThanksInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_rate_thanks: ((inputs?: Chat_Rate_ThanksInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Rate_ThanksInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Rate_ThanksInputs = {};
