/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_PromiseInputs */
/**
* | output |
* | --- |
* | "We keep your child's lessons on your account, so the next ones fit them." |
*
* @param {Parent_PromiseInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_promise: ((inputs?: Parent_PromiseInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_PromiseInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_PromiseInputs = {};
