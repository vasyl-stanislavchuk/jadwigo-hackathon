/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Crash_TitleInputs */
/**
* | output |
* | --- |
* | "Something got stuck" |
*
* @param {Crash_TitleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const crash_title: ((inputs?: Crash_TitleInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Crash_TitleInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Crash_TitleInputs = {};
