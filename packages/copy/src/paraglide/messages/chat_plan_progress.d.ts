/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown>, m: NonNullable<unknown> }} Chat_Plan_ProgressInputs */
/**
* | output |
* | --- |
* | "{n} of {m}" |
*
* @param {Chat_Plan_ProgressInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_plan_progress: ((inputs: Chat_Plan_ProgressInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Plan_ProgressInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Plan_ProgressInputs = {
    n: NonNullable<unknown>;
    m: NonNullable<unknown>;
};
