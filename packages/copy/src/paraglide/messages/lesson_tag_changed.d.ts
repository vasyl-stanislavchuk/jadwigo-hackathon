/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Lesson_Tag_ChangedInputs */
/**
* | output |
* | --- |
* | "changed" |
*
* @param {Lesson_Tag_ChangedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const lesson_tag_changed: ((inputs?: Lesson_Tag_ChangedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Lesson_Tag_ChangedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Lesson_Tag_ChangedInputs = {};
