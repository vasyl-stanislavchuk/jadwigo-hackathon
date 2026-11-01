/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Worked_SolutionInputs */
/**
* | output |
* | --- |
* | "Solution" |
*
* @param {Worked_SolutionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const worked_solution: ((inputs?: Worked_SolutionInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Worked_SolutionInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Worked_SolutionInputs = {};
