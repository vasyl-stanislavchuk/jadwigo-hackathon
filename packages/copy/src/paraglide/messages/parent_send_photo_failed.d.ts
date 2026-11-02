/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Send_Photo_FailedInputs */
/**
* | output |
* | --- |
* | "Retry or remove the photo that did not upload" |
*
* @param {Parent_Send_Photo_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_send_photo_failed: ((inputs?: Parent_Send_Photo_FailedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Send_Photo_FailedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Send_Photo_FailedInputs = {};
