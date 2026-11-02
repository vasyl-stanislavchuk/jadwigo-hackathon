/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ title: NonNullable<unknown>, n: NonNullable<unknown> }} Chat_Citation_NthInputs */
/**
* | output |
* | --- |
* | "{title} {n}" |
*
* @param {Chat_Citation_NthInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_citation_nth: ((inputs: Chat_Citation_NthInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Citation_NthInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Citation_NthInputs = {
    title: NonNullable<unknown>;
    n: NonNullable<unknown>;
};
