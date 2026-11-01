/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Plan_In_ProgressInputs */
/**
* | output |
* | --- |
* | "in progress" |
*
* @param {Chat_Plan_In_ProgressInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_plan_in_progress: ((inputs?: Chat_Plan_In_ProgressInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Plan_In_ProgressInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Plan_In_ProgressInputs = {};
