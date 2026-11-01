/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ rows: NonNullable<unknown>, cols: NonNullable<unknown> }} DimsInputs */
/**
* | output |
* | --- |
* | "{rows} by {cols}" |
*
* @param {DimsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const dims: ((inputs: DimsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<DimsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type DimsInputs = {
    rows: NonNullable<unknown>;
    cols: NonNullable<unknown>;
};
