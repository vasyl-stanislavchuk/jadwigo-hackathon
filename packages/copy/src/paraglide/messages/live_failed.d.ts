/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Live_FailedInputs */
/**
* | output |
* | --- |
* | "Didn't work" |
*
* @param {Live_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const live_failed: ((inputs?: Live_FailedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Live_FailedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Live_FailedInputs = {};
