/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Drag_HintInputs */
/**
* | output |
* | --- |
* | "Drag a card, or tap it and then tap the right place." |
*
* @param {Drag_HintInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const drag_hint: ((inputs?: Drag_HintInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Drag_HintInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Drag_HintInputs = {};
