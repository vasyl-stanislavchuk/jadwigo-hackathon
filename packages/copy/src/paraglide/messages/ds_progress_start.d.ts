/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Ds_Progress_StartInputs */
/**
* | output |
* | --- |
* | "Lesson: just started" |
*
* @param {Ds_Progress_StartInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_progress_start: ((inputs?: Ds_Progress_StartInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Ds_Progress_StartInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Ds_Progress_StartInputs = {};
