/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ category: NonNullable<unknown> }} Mic_CheckInputs */
/**
* | category | output |
* | --- | --- |
* | "adult" | "Microphone check (coming soon)" |
* | * | "Microphone check — coming soon" |
*
* @param {Mic_CheckInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const mic_check: ((inputs: Mic_CheckInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Mic_CheckInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Mic_CheckInputs = {
    category: NonNullable<unknown>;
};
