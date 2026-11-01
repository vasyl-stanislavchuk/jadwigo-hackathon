/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Code_Copy_FailedInputs */
/**
* | output |
* | --- |
* | "Could not copy. Select the command and copy it by hand." |
*
* @param {Code_Copy_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const code_copy_failed: ((inputs?: Code_Copy_FailedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Code_Copy_FailedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Code_Copy_FailedInputs = {};
