/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Crash_TextInputs */
/**
* | output |
* | --- |
* | "It's not your fault. Let's start again." |
*
* @param {Crash_TextInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const crash_text: ((inputs?: Crash_TextInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Crash_TextInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Crash_TextInputs = {};
