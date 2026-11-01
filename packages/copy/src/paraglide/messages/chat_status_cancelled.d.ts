/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Status_CancelledInputs */
/**
* | output |
* | --- |
* | "Stopped" |
*
* @param {Chat_Status_CancelledInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_status_cancelled: ((inputs?: Chat_Status_CancelledInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Status_CancelledInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Status_CancelledInputs = {};
