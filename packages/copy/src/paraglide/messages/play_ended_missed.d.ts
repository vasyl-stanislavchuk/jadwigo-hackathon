/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ category: NonNullable<unknown> }} Play_Ended_MissedInputs */
/**
* | category | output |
* | --- | --- |
* | "adult" | "Not yet" |
* | * | "Still learning this one" |
*
* @param {Play_Ended_MissedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_ended_missed: ((inputs: Play_Ended_MissedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Play_Ended_MissedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Play_Ended_MissedInputs = {
    category: NonNullable<unknown>;
};
