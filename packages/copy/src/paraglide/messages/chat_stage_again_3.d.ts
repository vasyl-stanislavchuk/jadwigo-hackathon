/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Stage_Again_3Inputs */
/**
* | output |
* | --- |
* | "third time" |
*
* @param {Chat_Stage_Again_3Inputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_stage_again_3: ((inputs?: Chat_Stage_Again_3Inputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Stage_Again_3Inputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Stage_Again_3Inputs = {};
