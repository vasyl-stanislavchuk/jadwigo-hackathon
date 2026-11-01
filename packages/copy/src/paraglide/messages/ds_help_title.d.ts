/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Ds_Help_TitleInputs */
/**
* | output |
* | --- |
* | "Help" |
*
* @param {Ds_Help_TitleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_help_title: ((inputs?: Ds_Help_TitleInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Ds_Help_TitleInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Ds_Help_TitleInputs = {};
