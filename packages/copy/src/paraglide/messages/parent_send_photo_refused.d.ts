/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Send_Photo_RefusedInputs */
/**
* | output |
* | --- |
* | "Remove the photo that cannot be sent" |
*
* @param {Parent_Send_Photo_RefusedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_send_photo_refused: ((inputs?: Parent_Send_Photo_RefusedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Send_Photo_RefusedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Send_Photo_RefusedInputs = {};
