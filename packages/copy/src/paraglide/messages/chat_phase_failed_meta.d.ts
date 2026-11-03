/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ t: NonNullable<unknown> }} Chat_Phase_Failed_MetaInputs */
/**
* | output |
* | --- |
* | "stopped early · {t}" |
*
* @param {Chat_Phase_Failed_MetaInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_phase_failed_meta: ((inputs: Chat_Phase_Failed_MetaInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Phase_Failed_MetaInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Phase_Failed_MetaInputs = {
    t: NonNullable<unknown>;
};
