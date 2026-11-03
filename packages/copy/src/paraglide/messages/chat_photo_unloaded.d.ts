/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Chat_Photo_UnloadedInputs */
/**
* | output |
* | --- |
* | "Photo {n} could not be shown" |
*
* @param {Chat_Photo_UnloadedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_photo_unloaded: ((inputs: Chat_Photo_UnloadedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Photo_UnloadedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Photo_UnloadedInputs = {
    n: NonNullable<unknown>;
};
