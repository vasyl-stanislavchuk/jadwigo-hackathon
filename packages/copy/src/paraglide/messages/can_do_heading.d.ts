/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ category: NonNullable<unknown> }} Can_Do_HeadingInputs */
/**
* | category | output |
* | --- | --- |
* | "adult" | "What you can do now" |
* | * | "What I can do" |
*
* @param {Can_Do_HeadingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const can_do_heading: ((inputs: Can_Do_HeadingInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Can_Do_HeadingInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Can_Do_HeadingInputs = {
    category: NonNullable<unknown>;
};
