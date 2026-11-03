/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ t: NonNullable<unknown> }} Chat_Phase_Stopped_MetaInputs */
/**
* | output |
* | --- |
* | "stopped · {t}" |
*
* @param {Chat_Phase_Stopped_MetaInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_phase_stopped_meta: ((inputs: Chat_Phase_Stopped_MetaInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Phase_Stopped_MetaInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Phase_Stopped_MetaInputs = {
    t: NonNullable<unknown>;
};
