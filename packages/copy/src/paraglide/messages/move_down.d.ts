/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Move_DownInputs */
/**
* | output |
* | --- |
* | "Move down" |
*
* @param {Move_DownInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const move_down: ((inputs?: Move_DownInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Move_DownInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Move_DownInputs = {};
