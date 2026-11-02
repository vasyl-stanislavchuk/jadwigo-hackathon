/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Ai_About_LinkInputs */
/**
* | output |
* | --- |
* | "More about Jadwigo AI" |
*
* @param {Parent_Ai_About_LinkInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_ai_about_link: ((inputs?: Parent_Ai_About_LinkInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Ai_About_LinkInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Ai_About_LinkInputs = {};
