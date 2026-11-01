/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Clock_FaceInputs */
/**
* | output |
* | --- |
* | "Clock with hands" |
*
* @param {Clock_FaceInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const clock_face: ((inputs?: Clock_FaceInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Clock_FaceInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Clock_FaceInputs = {};
