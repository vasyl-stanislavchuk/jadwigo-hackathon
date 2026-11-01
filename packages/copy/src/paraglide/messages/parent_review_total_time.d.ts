/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ minutes: NonNullable<unknown>, seconds: NonNullable<unknown> }} Parent_Review_Total_TimeInputs */
/**
* | output |
* | --- |
* | "{minutes} min {seconds} s" |
*
* @param {Parent_Review_Total_TimeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_review_total_time: ((inputs: Parent_Review_Total_TimeInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Review_Total_TimeInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Review_Total_TimeInputs = {
    minutes: NonNullable<unknown>;
    seconds: NonNullable<unknown>;
};
