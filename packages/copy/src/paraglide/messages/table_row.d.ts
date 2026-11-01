/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ row: NonNullable<unknown> }} Table_RowInputs */
/**
* | output |
* | --- |
* | "Times table: the {row}s" |
*
* @param {Table_RowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const table_row: ((inputs: Table_RowInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Table_RowInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Table_RowInputs = {
    row: NonNullable<unknown>;
};
