/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Ds_Compare_SolutionInputs */
/**
* | output |
* | --- |
* | "Compare it with your answer." |
*
* @param {Ds_Compare_SolutionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_compare_solution: ((inputs?: Ds_Compare_SolutionInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Ds_Compare_SolutionInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Ds_Compare_SolutionInputs = {};
