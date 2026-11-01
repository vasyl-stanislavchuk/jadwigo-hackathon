/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ category: NonNullable<unknown> }} Play_Ended_DoneInputs */
/**
* | category | output |
* | --- | --- |
* | "adult" | "Done" |
* | * | "Done" |
*
* @param {Play_Ended_DoneInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_ended_done: ((inputs: Play_Ended_DoneInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Play_Ended_DoneInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Play_Ended_DoneInputs = {
    category: NonNullable<unknown>;
};
