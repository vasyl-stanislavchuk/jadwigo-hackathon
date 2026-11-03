/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Phase_Waiting_MetaInputs */
/**
* | output |
* | --- |
* | "waiting for you" |
*
* @param {Chat_Phase_Waiting_MetaInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_phase_waiting_meta: ((inputs?: Chat_Phase_Waiting_MetaInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Phase_Waiting_MetaInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Phase_Waiting_MetaInputs = {};
