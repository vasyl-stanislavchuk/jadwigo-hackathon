/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ message: NonNullable<unknown> }} Chat_ProblemInputs */
/**
* | output |
* | --- |
* | "Something went off track: {message}" |
*
* @param {Chat_ProblemInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_problem: ((inputs: Chat_ProblemInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_ProblemInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_ProblemInputs = {
    message: NonNullable<unknown>;
};
