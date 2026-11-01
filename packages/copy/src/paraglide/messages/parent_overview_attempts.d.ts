/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Parent_Overview_AttemptsInputs */
/**
* | output |
* | --- |
* | "Attempts: {n}" |
*
* @param {Parent_Overview_AttemptsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_overview_attempts: ((inputs: Parent_Overview_AttemptsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Overview_AttemptsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Overview_AttemptsInputs = {
    n: NonNullable<unknown>;
};
