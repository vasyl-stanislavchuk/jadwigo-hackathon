/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ category: NonNullable<unknown> }} Load_FailedInputs */
/**
* | category | output |
* | --- | --- |
* | "adult" | "This lesson didn't load. Reload the page to try again." |
* | * | "Something got stuck. Ask a grown-up for help." |
*
* @param {Load_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const load_failed: ((inputs: Load_FailedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Load_FailedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Load_FailedInputs = {
    category: NonNullable<unknown>;
};
