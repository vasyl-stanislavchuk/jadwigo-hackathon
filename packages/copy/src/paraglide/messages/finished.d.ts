/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ category: NonNullable<unknown> }} FinishedInputs */
/**
* | category | output |
* | --- | --- |
* | "adult" | "That's the lesson done. Thank you!" |
* | * | "That's all for today. Thank you!" |
*
* @param {FinishedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const finished: ((inputs: FinishedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<FinishedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type FinishedInputs = {
    category: NonNullable<unknown>;
};
