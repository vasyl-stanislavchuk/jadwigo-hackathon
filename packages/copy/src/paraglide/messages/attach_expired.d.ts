/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Attach_ExpiredInputs */
/**
* | output |
* | --- |
* | "The upload took too long. Try again" |
*
* @param {Attach_ExpiredInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_expired: ((inputs?: Attach_ExpiredInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Attach_ExpiredInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Attach_ExpiredInputs = {};
