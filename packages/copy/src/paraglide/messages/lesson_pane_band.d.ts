/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Lesson_Pane_BandInputs */
/**
* | output |
* | --- |
* | "Jadwigo is changing this lesson. Changes will appear here." |
*
* @param {Lesson_Pane_BandInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const lesson_pane_band: ((inputs?: Lesson_Pane_BandInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Lesson_Pane_BandInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Lesson_Pane_BandInputs = {};
