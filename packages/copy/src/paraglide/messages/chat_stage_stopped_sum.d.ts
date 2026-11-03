/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Stage_Stopped_SumInputs */
/**
* | output |
* | --- |
* | "stopped" |
*
* @param {Chat_Stage_Stopped_SumInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_stage_stopped_sum: ((inputs?: Chat_Stage_Stopped_SumInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Stage_Stopped_SumInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Stage_Stopped_SumInputs = {};
