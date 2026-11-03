/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Stalled_BodyInputs */
/**
* | output |
* | --- |
* | "You can wait or start this request again. What is already in the lesson stays." |
*
* @param {Chat_Stalled_BodyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_stalled_body: ((inputs?: Chat_Stalled_BodyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Stalled_BodyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Stalled_BodyInputs = {};
