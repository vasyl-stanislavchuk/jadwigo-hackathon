/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ email: NonNullable<unknown> }} Parent_Code_SentInputs */
/**
* | output |
* | --- |
* | "We sent a code to {email}." |
*
* @param {Parent_Code_SentInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_code_sent: ((inputs: Parent_Code_SentInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Code_SentInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Code_SentInputs = {
    email: NonNullable<unknown>;
};
