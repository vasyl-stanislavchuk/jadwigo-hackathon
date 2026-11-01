/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Move_UpInputs */
/**
* | output |
* | --- |
* | "Move up" |
*
* @param {Move_UpInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const move_up: ((inputs?: Move_UpInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Move_UpInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Move_UpInputs = {};
