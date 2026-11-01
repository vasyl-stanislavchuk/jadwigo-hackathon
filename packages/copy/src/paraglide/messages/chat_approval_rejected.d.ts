/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ summary: NonNullable<unknown> }} Chat_Approval_RejectedInputs */
/**
* | output |
* | --- |
* | "Declined: {summary}" |
*
* @param {Chat_Approval_RejectedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_approval_rejected: ((inputs: Chat_Approval_RejectedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Approval_RejectedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Approval_RejectedInputs = {
    summary: NonNullable<unknown>;
};
