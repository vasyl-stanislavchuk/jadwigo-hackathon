/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ summary: NonNullable<unknown> }} Chat_ApprovalInputs */
/**
* | output |
* | --- |
* | "Needs your decision: {summary}" |
*
* @param {Chat_ApprovalInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_approval: ((inputs: Chat_ApprovalInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_ApprovalInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_ApprovalInputs = {
    summary: NonNullable<unknown>;
};
