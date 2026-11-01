/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ tries: NonNullable<unknown>, help: NonNullable<unknown>, time: NonNullable<unknown> }} Parent_Overview_Sheet_LineInputs */
/**
* | output |
* | --- |
* | "{tries} · {help} · {time}" |
*
* @param {Parent_Overview_Sheet_LineInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_overview_sheet_line: ((inputs: Parent_Overview_Sheet_LineInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Overview_Sheet_LineInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Overview_Sheet_LineInputs = {
    tries: NonNullable<unknown>;
    help: NonNullable<unknown>;
    time: NonNullable<unknown>;
};
