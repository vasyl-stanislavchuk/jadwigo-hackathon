/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Problem_RetryingInputs */
/**
* | output |
* | --- |
* | "Trying again." |
*
* @param {Chat_Problem_RetryingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_problem_retrying: ((inputs?: Chat_Problem_RetryingInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Problem_RetryingInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Problem_RetryingInputs = {};
