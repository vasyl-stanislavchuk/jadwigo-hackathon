/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Chat_Failed_BodyInputs */
/**
* | times_noun | output |
* | --- | --- |
* | "one" | "Jadwigo tried {n} time. Your request is saved, you can try again." |
* | "other" | "Jadwigo tried {n} times. Your request is saved, you can try again." |
*
* @param {Chat_Failed_BodyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_failed_body: ((inputs: Chat_Failed_BodyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Failed_BodyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Failed_BodyInputs = {
    n: NonNullable<unknown>;
};
