/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Ideas_Why_Second_Day_OwedInputs */
/**
* | output |
* | --- |
* | "A second day of practice" |
*
* @param {Chat_Ideas_Why_Second_Day_OwedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_ideas_why_second_day_owed: ((inputs?: Chat_Ideas_Why_Second_Day_OwedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Ideas_Why_Second_Day_OwedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Ideas_Why_Second_Day_OwedInputs = {};
