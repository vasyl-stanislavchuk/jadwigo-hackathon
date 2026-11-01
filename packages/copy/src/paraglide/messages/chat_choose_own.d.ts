/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Choose_OwnInputs */
/**
* | output |
* | --- |
* | "In your own words" |
*
* @param {Chat_Choose_OwnInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_choose_own: ((inputs?: Chat_Choose_OwnInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Choose_OwnInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Choose_OwnInputs = {};
