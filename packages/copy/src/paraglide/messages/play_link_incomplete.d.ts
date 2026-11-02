/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Play_Link_IncompleteInputs */
/**
* | output |
* | --- |
* | "This link is not complete. Ask a parent for a new one." |
*
* @param {Play_Link_IncompleteInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_link_incomplete: ((inputs?: Play_Link_IncompleteInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Play_Link_IncompleteInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Play_Link_IncompleteInputs = {};
