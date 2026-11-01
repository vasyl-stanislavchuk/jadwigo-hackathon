/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ category: NonNullable<unknown> }} StartInputs */
/**
* | category | output |
* | --- | --- |
* | "adult" | "Start the lesson" |
* | * | "Let's start!" |
*
* @param {StartInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const start: ((inputs: StartInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<StartInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type StartInputs = {
    category: NonNullable<unknown>;
};
