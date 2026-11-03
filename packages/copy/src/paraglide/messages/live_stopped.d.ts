/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Live_StoppedInputs */
/**
* | output |
* | --- |
* | "Stopped" |
*
* @param {Live_StoppedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const live_stopped: ((inputs?: Live_StoppedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Live_StoppedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Live_StoppedInputs = {};
