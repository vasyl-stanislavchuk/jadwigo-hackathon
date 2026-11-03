/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Stage_Again_2Inputs */
/**
* | output |
* | --- |
* | "second time" |
*
* @param {Chat_Stage_Again_2Inputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_stage_again_2: ((inputs?: Chat_Stage_Again_2Inputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Stage_Again_2Inputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Stage_Again_2Inputs = {};
