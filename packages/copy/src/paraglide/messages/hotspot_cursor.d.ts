/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ x: NonNullable<unknown>, y: NonNullable<unknown> }} Hotspot_CursorInputs */
/**
* | output |
* | --- |
* | "Target: {x} from the left, {y} from the top" |
*
* @param {Hotspot_CursorInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const hotspot_cursor: ((inputs: Hotspot_CursorInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Hotspot_CursorInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Hotspot_CursorInputs = {
    x: NonNullable<unknown>;
    y: NonNullable<unknown>;
};
