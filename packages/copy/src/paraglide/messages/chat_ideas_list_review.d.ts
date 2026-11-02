/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Ideas_List_ReviewInputs */
/**
* | output |
* | --- |
* | "Time to review" |
*
* @param {Chat_Ideas_List_ReviewInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_ideas_list_review: ((inputs?: Chat_Ideas_List_ReviewInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Ideas_List_ReviewInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Ideas_List_ReviewInputs = {};
