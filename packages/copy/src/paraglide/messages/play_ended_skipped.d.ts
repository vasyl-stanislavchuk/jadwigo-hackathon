/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ category: NonNullable<unknown> }} Play_Ended_SkippedInputs */
/**
* | category | output |
* | --- | --- |
* | "adult" | "Skipped" |
* | * | "We will come back to it" |
*
* @param {Play_Ended_SkippedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_ended_skipped: ((inputs: Play_Ended_SkippedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Play_Ended_SkippedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Play_Ended_SkippedInputs = {
    category: NonNullable<unknown>;
};
