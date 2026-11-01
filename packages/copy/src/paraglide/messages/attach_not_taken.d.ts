/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Attach_Not_TakenInputs */
/**
* | output |
* | --- |
* | "The server did not take the photo. Try again" |
*
* @param {Attach_Not_TakenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_not_taken: ((inputs?: Attach_Not_TakenInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Attach_Not_TakenInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Attach_Not_TakenInputs = {};
