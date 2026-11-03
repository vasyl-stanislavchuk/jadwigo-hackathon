/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Chat_Photo_OpenInputs */
/**
* | output |
* | --- |
* | "Show photo {n} full size" |
*
* @param {Chat_Photo_OpenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_photo_open: ((inputs: Chat_Photo_OpenInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Photo_OpenInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Photo_OpenInputs = {
    n: NonNullable<unknown>;
};
