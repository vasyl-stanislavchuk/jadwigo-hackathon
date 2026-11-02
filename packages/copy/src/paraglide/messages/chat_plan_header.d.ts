/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown>, m: NonNullable<unknown> }} Chat_Plan_HeaderInputs */
/**
* | output |
* | --- |
* | "Plan · {n} of {m}" |
*
* @param {Chat_Plan_HeaderInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_plan_header: ((inputs: Chat_Plan_HeaderInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Plan_HeaderInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Plan_HeaderInputs = {
    n: NonNullable<unknown>;
    m: NonNullable<unknown>;
};
