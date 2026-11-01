/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Check_Level_ErrorInputs */
/**
* | output |
* | --- |
* | "To fix" |
*
* @param {Chat_Check_Level_ErrorInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_check_level_error: ((inputs?: Chat_Check_Level_ErrorInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Check_Level_ErrorInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Check_Level_ErrorInputs = {};
