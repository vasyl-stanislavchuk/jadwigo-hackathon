/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Parent_Overview_TriesInputs */
/**
* | output |
* | --- |
* | "Tries: {n}" |
*
* @param {Parent_Overview_TriesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_overview_tries: ((inputs: Parent_Overview_TriesInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Overview_TriesInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Overview_TriesInputs = {
    n: NonNullable<unknown>;
};
