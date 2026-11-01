/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ category: NonNullable<unknown> }} Moved_OnInputs */
/**
* | category | output |
* | --- | --- |
* | "adult" | "Fine, we'll come back to this one." |
* | * | "Okay, we'll come back to it." |
*
* @param {Moved_OnInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const moved_on: ((inputs: Moved_OnInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Moved_OnInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Moved_OnInputs = {
    category: NonNullable<unknown>;
};
