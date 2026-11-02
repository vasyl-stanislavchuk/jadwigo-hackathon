/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Chat_Mistakes_TimesInputs */
/**
* | count_noun | output |
* | --- | --- |
* | "one" | "{n} time" |
* | "other" | "{n} times" |
*
* @param {Chat_Mistakes_TimesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_mistakes_times: ((inputs: Chat_Mistakes_TimesInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Mistakes_TimesInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Mistakes_TimesInputs = {
    n: NonNullable<unknown>;
};
