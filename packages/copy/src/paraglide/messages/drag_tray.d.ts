/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Drag_TrayInputs */
/**
* | output |
* | --- |
* | "Still to sort" |
*
* @param {Drag_TrayInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const drag_tray: ((inputs?: Drag_TrayInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Drag_TrayInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Drag_TrayInputs = {};
