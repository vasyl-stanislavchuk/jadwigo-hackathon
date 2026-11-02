/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ percent: NonNullable<unknown> }} Attach_UploadingInputs */
/**
* | output |
* | --- |
* | "Uploading the photo, {percent}%" |
*
* @param {Attach_UploadingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_uploading: ((inputs: Attach_UploadingInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Attach_UploadingInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Attach_UploadingInputs = {
    percent: NonNullable<unknown>;
};
