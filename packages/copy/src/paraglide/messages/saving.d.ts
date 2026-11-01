/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} SavingInputs */
/**
* | output |
* | --- |
* | "Saving…" |
*
* @param {SavingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const saving: ((inputs?: SavingInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<SavingInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type SavingInputs = {};
