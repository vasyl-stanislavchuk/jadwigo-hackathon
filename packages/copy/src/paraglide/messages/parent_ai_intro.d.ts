/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Ai_IntroInputs */
/**
* | output |
* | --- |
* | "Jadwigo AI makes a lesson from what you describe." |
*
* @param {Parent_Ai_IntroInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_ai_intro: ((inputs?: Parent_Ai_IntroInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Ai_IntroInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Ai_IntroInputs = {};
