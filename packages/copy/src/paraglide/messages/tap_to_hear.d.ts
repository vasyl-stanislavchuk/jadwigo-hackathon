/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Tap_To_HearInputs */
/**
* | output |
* | --- |
* | "Tap to hear" |
*
* @param {Tap_To_HearInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const tap_to_hear: ((inputs?: Tap_To_HearInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Tap_To_HearInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Tap_To_HearInputs = {};
