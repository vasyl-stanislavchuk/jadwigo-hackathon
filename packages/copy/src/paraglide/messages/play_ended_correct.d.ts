/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ category: NonNullable<unknown> }} Play_Ended_CorrectInputs */
/**
* | category | output |
* | --- | --- |
* | "adult" | "Right" |
* | * | "You got it" |
*
* @param {Play_Ended_CorrectInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_ended_correct: ((inputs: Play_Ended_CorrectInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Play_Ended_CorrectInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Play_Ended_CorrectInputs = {
    category: NonNullable<unknown>;
};
