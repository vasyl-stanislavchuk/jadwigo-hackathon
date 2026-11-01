/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ cmd: NonNullable<unknown> }} Code_CopyInputs */
/**
* | output |
* | --- |
* | "Copy: {cmd}" |
*
* @param {Code_CopyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const code_copy: ((inputs: Code_CopyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Code_CopyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Code_CopyInputs = {
    cmd: NonNullable<unknown>;
};
