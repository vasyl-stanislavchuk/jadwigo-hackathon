/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Status_Awaiting_InputInputs */
/**
* | output |
* | --- |
* | "Waiting for you" |
*
* @param {Chat_Status_Awaiting_InputInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_status_awaiting_input: ((inputs?: Chat_Status_Awaiting_InputInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Status_Awaiting_InputInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Status_Awaiting_InputInputs = {};
