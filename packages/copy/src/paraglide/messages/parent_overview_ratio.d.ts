/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown>, m: NonNullable<unknown> }} Parent_Overview_RatioInputs */
/**
* | output |
* | --- |
* | "{n}/{m}" |
*
* @param {Parent_Overview_RatioInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_overview_ratio: ((inputs: Parent_Overview_RatioInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Overview_RatioInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Overview_RatioInputs = {
    n: NonNullable<unknown>;
    m: NonNullable<unknown>;
};
