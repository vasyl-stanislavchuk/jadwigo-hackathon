/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_OfflineInputs */
/**
* | output |
* | --- |
* | "There's no connection. Your message stays here: send it once you're back online." |
*
* @param {Chat_OfflineInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_offline: ((inputs?: Chat_OfflineInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_OfflineInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_OfflineInputs = {};
