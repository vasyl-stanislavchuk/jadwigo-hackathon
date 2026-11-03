/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Play_Intro_AnonymousInputs */
/**
* | output |
* | --- |
* | "Play without a name" |
*
* @param {Play_Intro_AnonymousInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_intro_anonymous: ((inputs?: Play_Intro_AnonymousInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Play_Intro_AnonymousInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Play_Intro_AnonymousInputs = {};
