/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Dev_OnlyInputs */
/**
* | output |
* | --- |
* | "The chat page runs on the dev server only: start it with make dev." |
*
* @param {Chat_Dev_OnlyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_dev_only: ((inputs?: Chat_Dev_OnlyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Dev_OnlyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Dev_OnlyInputs = {};
