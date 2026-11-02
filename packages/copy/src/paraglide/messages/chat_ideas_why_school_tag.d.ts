/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Ideas_Why_School_TagInputs */
/**
* | output |
* | --- |
* | "School is on this now" |
*
* @param {Chat_Ideas_Why_School_TagInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_ideas_why_school_tag: ((inputs?: Chat_Ideas_Why_School_TagInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Ideas_Why_School_TagInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Ideas_Why_School_TagInputs = {};
