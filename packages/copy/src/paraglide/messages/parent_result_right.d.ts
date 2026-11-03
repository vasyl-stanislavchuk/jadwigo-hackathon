/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ right: NonNullable<unknown>, total: NonNullable<unknown> }} Parent_Result_RightInputs */
/**
* | output |
* | --- |
* | "{right} of {total} right" |
*
* @param {Parent_Result_RightInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_result_right: ((inputs: Parent_Result_RightInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Result_RightInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Result_RightInputs = {
    right: NonNullable<unknown>;
    total: NonNullable<unknown>;
};
