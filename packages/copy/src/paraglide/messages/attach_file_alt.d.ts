/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Attach_File_AltInputs */
/**
* | output |
* | --- |
* | "File {n}" |
*
* @param {Attach_File_AltInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_file_alt: ((inputs: Attach_File_AltInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Attach_File_AltInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Attach_File_AltInputs = {
    n: NonNullable<unknown>;
};
