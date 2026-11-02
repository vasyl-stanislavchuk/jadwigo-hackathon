/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ child: NonNullable<unknown> }} Chat_Context_ChildInputs */
/**
* | output |
* | --- |
* | "Jadwigo AI sees: {child}" |
*
* @param {Chat_Context_ChildInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_context_child: ((inputs: Chat_Context_ChildInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Context_ChildInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Context_ChildInputs = {
    child: NonNullable<unknown>;
};
