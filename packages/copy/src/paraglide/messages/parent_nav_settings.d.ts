/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Nav_SettingsInputs */
/**
* | output |
* | --- |
* | "Settings" |
*
* @param {Parent_Nav_SettingsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_nav_settings: ((inputs?: Parent_Nav_SettingsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Nav_SettingsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Nav_SettingsInputs = {};
