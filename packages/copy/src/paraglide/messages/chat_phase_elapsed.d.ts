/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ seconds: NonNullable<unknown> }} Chat_Phase_ElapsedInputs */
/**
* | output |
* | --- |
* | "{seconds} s" |
*
* @param {Chat_Phase_ElapsedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_phase_elapsed: ((inputs: Chat_Phase_ElapsedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Phase_ElapsedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Phase_ElapsedInputs = {
    seconds: NonNullable<unknown>;
};
