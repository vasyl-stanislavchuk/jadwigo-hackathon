/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Chat_Tags_MoreInputs */
/**
* | output |
* | --- |
* | "+{n} more" |
*
* @param {Chat_Tags_MoreInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tags_more: ((inputs: Chat_Tags_MoreInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Tags_MoreInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Tags_MoreInputs = {
    n: NonNullable<unknown>;
};
