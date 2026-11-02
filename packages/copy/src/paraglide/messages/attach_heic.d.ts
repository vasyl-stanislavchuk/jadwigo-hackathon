/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Attach_HeicInputs */
/**
* | output |
* | --- |
* | "We can't open this photo. Take a screenshot of it or save it as a JPG" |
*
* @param {Attach_HeicInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_heic: ((inputs?: Attach_HeicInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Attach_HeicInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Attach_HeicInputs = {};
