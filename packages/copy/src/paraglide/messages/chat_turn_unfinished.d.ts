/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Turn_UnfinishedInputs */
/**
* | output |
* | --- |
* | "This turn didn't finish. The lesson so far is saved, so you can try again." |
*
* @param {Chat_Turn_UnfinishedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_turn_unfinished: ((inputs?: Chat_Turn_UnfinishedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Turn_UnfinishedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Turn_UnfinishedInputs = {};
