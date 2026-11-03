/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Live_WorkingInputs */
/**
* | output |
* | --- |
* | "Jadwigo is working" |
*
* @param {Live_WorkingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const live_working: ((inputs?: Live_WorkingInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Live_WorkingInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Live_WorkingInputs = {};
