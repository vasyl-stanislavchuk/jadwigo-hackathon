/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Ideas_List_SchoolInputs */
/**
* | output |
* | --- |
* | "From school" |
*
* @param {Chat_Ideas_List_SchoolInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_ideas_list_school: ((inputs?: Chat_Ideas_List_SchoolInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Ideas_List_SchoolInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Ideas_List_SchoolInputs = {};
