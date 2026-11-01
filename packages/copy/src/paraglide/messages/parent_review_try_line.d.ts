/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ time: NonNullable<unknown>, help: NonNullable<unknown> }} Parent_Review_Try_LineInputs */
/**
* | output |
* | --- |
* | "{time} · {help}" |
*
* @param {Parent_Review_Try_LineInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_review_try_line: ((inputs: Parent_Review_Try_LineInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Review_Try_LineInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Review_Try_LineInputs = {
    time: NonNullable<unknown>;
    help: NonNullable<unknown>;
};
