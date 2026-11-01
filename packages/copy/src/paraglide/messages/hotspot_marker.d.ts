/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Hotspot_MarkerInputs */
/**
* | output |
* | --- |
* | "Tap {n}, tap again to lift it" |
*
* @param {Hotspot_MarkerInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const hotspot_marker: ((inputs: Hotspot_MarkerInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Hotspot_MarkerInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Hotspot_MarkerInputs = {
    n: NonNullable<unknown>;
};
