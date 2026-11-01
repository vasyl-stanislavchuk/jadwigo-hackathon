/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Home_TitleInputs */
/**
* | output |
* | --- |
* | "Pick a lesson" |
*
* @param {Home_TitleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const home_title: ((inputs?: Home_TitleInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Home_TitleInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Home_TitleInputs = {};
