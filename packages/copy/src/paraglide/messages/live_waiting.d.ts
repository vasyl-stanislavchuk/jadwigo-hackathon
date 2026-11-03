/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Live_WaitingInputs */
/**
* | output |
* | --- |
* | "Waiting for you" |
*
* @param {Live_WaitingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const live_waiting: ((inputs?: Live_WaitingInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Live_WaitingInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Live_WaitingInputs = {};
