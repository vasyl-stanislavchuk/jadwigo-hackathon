/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Reveal_DragInputs */
/**
* | output |
* | --- |
* | "Slide to see" |
*
* @param {Reveal_DragInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const reveal_drag: ((inputs?: Reveal_DragInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Reveal_DragInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Reveal_DragInputs = {};
