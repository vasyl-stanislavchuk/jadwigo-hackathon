/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Check_Level_InfoInputs */
/**
* | output |
* | --- |
* | "For your information" |
*
* @param {Chat_Check_Level_InfoInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_check_level_info: ((inputs?: Chat_Check_Level_InfoInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Check_Level_InfoInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Check_Level_InfoInputs = {};
