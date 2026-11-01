/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Check_Level_WarningInputs */
/**
* | output |
* | --- |
* | "Worth a look" |
*
* @param {Chat_Check_Level_WarningInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_check_level_warning: ((inputs?: Chat_Check_Level_WarningInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Check_Level_WarningInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Check_Level_WarningInputs = {};
