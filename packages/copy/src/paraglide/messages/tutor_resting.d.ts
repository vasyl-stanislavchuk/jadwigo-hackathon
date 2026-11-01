/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ category: NonNullable<unknown> }} Tutor_RestingInputs */
/**
* | category | output |
* | --- | --- |
* | "adult" | "Practising without voice today." |
* | * | "Quiet practice today." |
*
* @param {Tutor_RestingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const tutor_resting: ((inputs: Tutor_RestingInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Tutor_RestingInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Tutor_RestingInputs = {
    category: NonNullable<unknown>;
};
