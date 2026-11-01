/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Reveal_Have_IdeaInputs */
/**
* | output |
* | --- |
* | "I have an idea!" |
*
* @param {Reveal_Have_IdeaInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const reveal_have_idea: ((inputs?: Reveal_Have_IdeaInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Reveal_Have_IdeaInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Reveal_Have_IdeaInputs = {};
