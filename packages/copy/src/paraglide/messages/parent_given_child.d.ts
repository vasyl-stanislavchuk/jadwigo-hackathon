/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ name: NonNullable<unknown> }} Parent_Given_ChildInputs */
/**
* | output |
* | --- |
* | "The lesson is waiting for {name}." |
*
* @param {Parent_Given_ChildInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_given_child: ((inputs: Parent_Given_ChildInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Given_ChildInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Given_ChildInputs = {
    name: NonNullable<unknown>;
};
