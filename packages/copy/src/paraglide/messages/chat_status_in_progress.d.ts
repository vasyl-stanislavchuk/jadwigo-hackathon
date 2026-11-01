/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Status_In_ProgressInputs */
/**
* | output |
* | --- |
* | "Working on it" |
*
* @param {Chat_Status_In_ProgressInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_status_in_progress: ((inputs?: Chat_Status_In_ProgressInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Status_In_ProgressInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Status_In_ProgressInputs = {};
