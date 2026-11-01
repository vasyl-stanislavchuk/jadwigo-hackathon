/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Parent_Review_First_Try_CountInputs */
/**
* | output |
* | --- |
* | "Right on the first try: {n}" |
*
* @param {Parent_Review_First_Try_CountInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_review_first_try_count: ((inputs: Parent_Review_First_Try_CountInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Review_First_Try_CountInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Review_First_Try_CountInputs = {
    n: NonNullable<unknown>;
};
