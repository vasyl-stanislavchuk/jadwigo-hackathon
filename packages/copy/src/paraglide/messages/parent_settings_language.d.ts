/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Settings_LanguageInputs */
/**
* | output |
* | --- |
* | "Language" |
*
* @param {Parent_Settings_LanguageInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_settings_language: ((inputs?: Parent_Settings_LanguageInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Settings_LanguageInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Settings_LanguageInputs = {};
