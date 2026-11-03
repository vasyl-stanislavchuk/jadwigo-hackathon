/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Chat_Stage_Failed_SumInputs */
/**
* | tries_noun | output |
* | --- | --- |
* | "one" | "didn't work after {n} try" |
* | "other" | "didn't work after {n} tries" |
*
* @param {Chat_Stage_Failed_SumInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_stage_failed_sum: ((inputs: Chat_Stage_Failed_SumInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Stage_Failed_SumInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Stage_Failed_SumInputs = {
    n: NonNullable<unknown>;
};
