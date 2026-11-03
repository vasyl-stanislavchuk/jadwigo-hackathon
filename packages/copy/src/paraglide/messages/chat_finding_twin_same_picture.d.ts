/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Finding_Twin_Same_PictureInputs */
/**
* | output |
* | --- |
* | "The picture in the similar question shows this question's numbers." |
*
* @param {Chat_Finding_Twin_Same_PictureInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_twin_same_picture: ((inputs?: Chat_Finding_Twin_Same_PictureInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Finding_Twin_Same_PictureInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Finding_Twin_Same_PictureInputs = {};
