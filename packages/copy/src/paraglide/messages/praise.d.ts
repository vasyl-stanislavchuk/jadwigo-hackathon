/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ category: NonNullable<unknown>, line: 0 | "0" | 1 | "1" | 2 | "2" }} PraiseInputs */
/**
* | category | line | output |
* | --- | --- | --- |
* | "adult" | "0" | "That's right." |
* | "adult" | "1" | "Exactly." |
* | "adult" | "2" | "Good, that works." |
* | * | "0" | "Yes, that's it!" |
* | * | "1" | "Great work!" |
* | * | "2" | "Nice thinking!" |
*
* @param {PraiseInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const praise: ((inputs: PraiseInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<PraiseInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type PraiseInputs = {
    category: NonNullable<unknown>;
    line: 0 | "0" | 1 | "1" | 2 | "2";
};
