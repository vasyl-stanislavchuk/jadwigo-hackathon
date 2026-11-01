/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ done: NonNullable<unknown>, total: NonNullable<unknown> }} Parent_Steps_ReadyInputs */
/**
* | output |
* | --- |
* | "Steps ready: {done} of {total}" |
*
* @param {Parent_Steps_ReadyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_steps_ready: ((inputs: Parent_Steps_ReadyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Steps_ReadyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Steps_ReadyInputs = {
    done: NonNullable<unknown>;
    total: NonNullable<unknown>;
};
