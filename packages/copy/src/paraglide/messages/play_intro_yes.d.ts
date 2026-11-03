/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ name: NonNullable<unknown> }} Play_Intro_YesInputs */
/**
* | output |
* | --- |
* | "Yes, I'm {name}" |
*
* @param {Play_Intro_YesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_intro_yes: ((inputs: Play_Intro_YesInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Play_Intro_YesInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Play_Intro_YesInputs = {
    name: NonNullable<unknown>;
};
