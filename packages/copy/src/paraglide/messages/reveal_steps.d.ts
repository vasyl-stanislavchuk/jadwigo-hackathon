/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Reveal_StepsInputs */
/**
* | output |
* | --- |
* | "Step by step" |
*
* @param {Reveal_StepsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const reveal_steps: ((inputs?: Reveal_StepsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Reveal_StepsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Reveal_StepsInputs = {};
