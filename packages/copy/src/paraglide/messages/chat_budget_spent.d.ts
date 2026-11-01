/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ spent: NonNullable<unknown>, cap: NonNullable<unknown> }} Chat_Budget_SpentInputs */
/**
* | output |
* | --- |
* | "{spent} of {cap} USD" |
*
* @param {Chat_Budget_SpentInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_budget_spent: ((inputs: Chat_Budget_SpentInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Budget_SpentInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Budget_SpentInputs = {
    spent: NonNullable<unknown>;
    cap: NonNullable<unknown>;
};
