/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Budget_SteerInputs */
/**
* | output |
* | --- |
* | "Half the budget is used, so I'm finishing the lesson with what I have." |
*
* @param {Chat_Budget_SteerInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_budget_steer: ((inputs?: Chat_Budget_SteerInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Budget_SteerInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Budget_SteerInputs = {};
