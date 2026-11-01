/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Hotspot_AreaInputs */
/**
* | output |
* | --- |
* | "Picture. The arrow keys move the target, Enter places a marker, Backspace lifts the last one." |
*
* @param {Hotspot_AreaInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const hotspot_area: ((inputs?: Hotspot_AreaInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Hotspot_AreaInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Hotspot_AreaInputs = {};
