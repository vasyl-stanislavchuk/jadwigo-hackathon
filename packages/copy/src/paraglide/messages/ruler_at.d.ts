/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown>, unit: NonNullable<unknown> }} Ruler_AtInputs */
/**
* | output |
* | --- |
* | "Ruler zero at {n} {unit} from the left" |
*
* @param {Ruler_AtInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ruler_at: ((inputs: Ruler_AtInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Ruler_AtInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Ruler_AtInputs = {
    n: NonNullable<unknown>;
    unit: NonNullable<unknown>;
};
