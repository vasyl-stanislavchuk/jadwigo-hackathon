/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Attach_UnreadableInputs */
/**
* | output |
* | --- |
* | "We can't open this file as a photo. Pick a photo or a screenshot" |
*
* @param {Attach_UnreadableInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_unreadable: ((inputs?: Attach_UnreadableInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Attach_UnreadableInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Attach_UnreadableInputs = {};
