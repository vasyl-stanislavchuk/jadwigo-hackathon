/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ category: NonNullable<unknown> }} Move_OnInputs */
/**
* | category | output |
* | --- | --- |
* | "adult" | "Skip for now" |
* | * | "Not sure yet — next" |
*
* @param {Move_OnInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const move_on: ((inputs: Move_OnInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Move_OnInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Move_OnInputs = {
    category: NonNullable<unknown>;
};
