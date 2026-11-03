/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Lesson_Tag_NewInputs */
/**
* | output |
* | --- |
* | "new" |
*
* @param {Lesson_Tag_NewInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const lesson_tag_new: ((inputs?: Lesson_Tag_NewInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Lesson_Tag_NewInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Lesson_Tag_NewInputs = {};
