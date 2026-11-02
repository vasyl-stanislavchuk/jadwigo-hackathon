/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ name: NonNullable<unknown> }} Parent_Give_ChildInputs */
/**
* | output |
* | --- |
* | "Give the lesson · {name}" |
*
* @param {Parent_Give_ChildInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_give_child: ((inputs: Parent_Give_ChildInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Give_ChildInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Give_ChildInputs = {
    name: NonNullable<unknown>;
};
