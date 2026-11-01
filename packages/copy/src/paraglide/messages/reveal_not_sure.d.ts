/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Reveal_Not_SureInputs */
/**
* | output |
* | --- |
* | "Not sure yet" |
*
* @param {Reveal_Not_SureInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const reveal_not_sure: ((inputs?: Reveal_Not_SureInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Reveal_Not_SureInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Reveal_Not_SureInputs = {};
