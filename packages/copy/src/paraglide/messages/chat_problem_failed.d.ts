/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Problem_FailedInputs */
/**
* | output |
* | --- |
* | "Jadwigo could not finish this request, even after a few tries." |
*
* @param {Chat_Problem_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_problem_failed: ((inputs?: Chat_Problem_FailedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Problem_FailedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Problem_FailedInputs = {};
