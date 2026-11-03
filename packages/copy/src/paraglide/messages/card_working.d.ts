/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown>, next: NonNullable<unknown> }} Card_WorkingInputs */
/**
* | output |
* | --- |
* | "Version {n} · Jadwigo is making version {next}" |
*
* @param {Card_WorkingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const card_working: ((inputs: Card_WorkingInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Card_WorkingInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Card_WorkingInputs = {
    n: NonNullable<unknown>;
    next: NonNullable<unknown>;
};
