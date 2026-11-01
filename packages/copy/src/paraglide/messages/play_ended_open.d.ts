/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ category: NonNullable<unknown> }} Play_Ended_OpenInputs */
/**
* | category | output |
* | --- | --- |
* | "adult" | "Still open" |
* | * | "Still to come" |
*
* @param {Play_Ended_OpenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_ended_open: ((inputs: Play_Ended_OpenInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Play_Ended_OpenInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Play_Ended_OpenInputs = {
    category: NonNullable<unknown>;
};
