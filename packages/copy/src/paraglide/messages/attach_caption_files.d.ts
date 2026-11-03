/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Attach_Caption_FilesInputs */
/**
* | output |
* | --- |
* | "This is how Jadwigo sees the files" |
*
* @param {Attach_Caption_FilesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_caption_files: ((inputs?: Attach_Caption_FilesInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Attach_Caption_FilesInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Attach_Caption_FilesInputs = {};
