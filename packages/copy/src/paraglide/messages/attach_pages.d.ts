/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Attach_PagesInputs */
/**
* | pages_noun | output |
* | --- | --- |
* | "one" | "{n} page" |
* | "other" | "{n} pages" |
*
* @param {Attach_PagesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_pages: ((inputs: Attach_PagesInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Attach_PagesInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Attach_PagesInputs = {
    n: NonNullable<unknown>;
};
