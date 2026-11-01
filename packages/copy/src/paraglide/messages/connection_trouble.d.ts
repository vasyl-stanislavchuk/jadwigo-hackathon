/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Connection_TroubleInputs */
/**
* | output |
* | --- |
* | "Just a moment, saving again…" |
*
* @param {Connection_TroubleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const connection_trouble: ((inputs?: Connection_TroubleInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Connection_TroubleInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Connection_TroubleInputs = {};
