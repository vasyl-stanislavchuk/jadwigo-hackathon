/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ seconds: NonNullable<unknown> }} Parent_Review_TimeInputs */
/**
* | output |
* | --- |
* | "Time: {seconds} s" |
*
* @param {Parent_Review_TimeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_review_time: ((inputs: Parent_Review_TimeInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Review_TimeInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Review_TimeInputs = {
    seconds: NonNullable<unknown>;
};
