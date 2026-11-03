/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Finding_Hint_Gives_KeyInputs */
/**
* | output |
* | --- |
* | "The first hint may give the answer away." |
*
* @param {Chat_Finding_Hint_Gives_KeyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_hint_gives_key: ((inputs?: Chat_Finding_Hint_Gives_KeyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Finding_Hint_Gives_KeyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Finding_Hint_Gives_KeyInputs = {};
