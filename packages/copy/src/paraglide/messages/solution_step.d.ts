/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown>, total: NonNullable<unknown> }} Solution_StepInputs */
/**
* | output |
* | --- |
* | "Step {n} of {total}" |
*
* @param {Solution_StepInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const solution_step: ((inputs: Solution_StepInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Solution_StepInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Solution_StepInputs = {
    n: NonNullable<unknown>;
    total: NonNullable<unknown>;
};
