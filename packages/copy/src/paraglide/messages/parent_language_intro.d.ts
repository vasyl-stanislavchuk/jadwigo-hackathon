/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Language_IntroInputs */
/**
* | output |
* | --- |
* | "The parent pages show in this language." |
*
* @param {Parent_Language_IntroInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_language_intro: ((inputs?: Parent_Language_IntroInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Language_IntroInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Language_IntroInputs = {};
