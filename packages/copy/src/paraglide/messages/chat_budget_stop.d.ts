/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Budget_StopInputs */
/**
* | output |
* | --- |
* | "The budget is nearly used up, so this is where I stop." |
*
* @param {Chat_Budget_StopInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_budget_stop: ((inputs?: Chat_Budget_StopInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Budget_StopInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Budget_StopInputs = {};
