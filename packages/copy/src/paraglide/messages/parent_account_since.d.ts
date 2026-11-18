/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ date: NonNullable<unknown> }} Parent_Account_SinceInputs */
/**
* | output |
* | --- |
* | "Account made on {date}." |
*
* @param {Parent_Account_SinceInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_account_since: ((inputs: Parent_Account_SinceInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Account_SinceInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Account_SinceInputs = {
    date: NonNullable<unknown>;
};
