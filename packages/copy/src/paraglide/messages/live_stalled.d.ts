/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Live_StalledInputs */
/**
* | output |
* | --- |
* | "Stuck" |
*
* @param {Live_StalledInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const live_stalled: ((inputs?: Live_StalledInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Live_StalledInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Live_StalledInputs = {};
