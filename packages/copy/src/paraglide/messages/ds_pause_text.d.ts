/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Ds_Pause_TextInputs */
/**
* | output |
* | --- |
* | "The lesson will wait. You'll come back to the same question." |
*
* @param {Ds_Pause_TextInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_pause_text: ((inputs?: Ds_Pause_TextInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Ds_Pause_TextInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Ds_Pause_TextInputs = {};
