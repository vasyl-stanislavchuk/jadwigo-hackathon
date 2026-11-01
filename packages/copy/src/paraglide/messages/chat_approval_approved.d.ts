/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ summary: NonNullable<unknown> }} Chat_Approval_ApprovedInputs */
/**
* | output |
* | --- |
* | "Approved: {summary}" |
*
* @param {Chat_Approval_ApprovedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_approval_approved: ((inputs: Chat_Approval_ApprovedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Approval_ApprovedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Approval_ApprovedInputs = {
    summary: NonNullable<unknown>;
};
