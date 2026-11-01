/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Ds_Progress_HalfInputs */
/**
* | output |
* | --- |
* | "Lesson: about halfway" |
*
* @param {Ds_Progress_HalfInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_progress_half: ((inputs?: Ds_Progress_HalfInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Ds_Progress_HalfInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Ds_Progress_HalfInputs = {};
