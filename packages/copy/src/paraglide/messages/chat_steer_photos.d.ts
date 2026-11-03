/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Chat_Steer_PhotosInputs */
/**
* | photos_noun | output |
* | --- | --- |
* | "one" | "“{n} photo”" |
* | "other" | "“{n} photos”" |
*
* @param {Chat_Steer_PhotosInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_steer_photos: ((inputs: Chat_Steer_PhotosInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Steer_PhotosInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Steer_PhotosInputs = {
    n: NonNullable<unknown>;
};
