/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Send_UploadingInputs */
/**
* | output |
* | --- |
* | "Waiting for the photos to upload" |
*
* @param {Parent_Send_UploadingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_send_uploading: ((inputs?: Parent_Send_UploadingInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Send_UploadingInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Send_UploadingInputs = {};
