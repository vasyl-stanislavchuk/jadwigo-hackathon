/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Play_Intro_Not_MeInputs */
/**
* | output |
* | --- |
* | "That's not me" |
*
* @param {Play_Intro_Not_MeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_intro_not_me: ((inputs?: Play_Intro_Not_MeInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Play_Intro_Not_MeInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Play_Intro_Not_MeInputs = {};
