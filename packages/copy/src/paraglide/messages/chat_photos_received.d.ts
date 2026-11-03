/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Photos_ReceivedInputs */
/**
* | output |
* | --- |
* | "What Jadwigo received" |
*
* @param {Chat_Photos_ReceivedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_photos_received: ((inputs?: Chat_Photos_ReceivedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Photos_ReceivedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Photos_ReceivedInputs = {};
