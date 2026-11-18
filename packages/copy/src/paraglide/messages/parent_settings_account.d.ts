/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Settings_AccountInputs */
/**
* | output |
* | --- |
* | "Account" |
*
* @param {Parent_Settings_AccountInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_settings_account: ((inputs?: Parent_Settings_AccountInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Settings_AccountInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Settings_AccountInputs = {};
