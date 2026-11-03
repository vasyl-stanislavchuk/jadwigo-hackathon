/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Play_Intro_Name_MissingInputs */
/**
* | output |
* | --- |
* | "Type your name, or play without one." |
*
* @param {Play_Intro_Name_MissingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_intro_name_missing: ((inputs?: Play_Intro_Name_MissingInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Play_Intro_Name_MissingInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Play_Intro_Name_MissingInputs = {};
