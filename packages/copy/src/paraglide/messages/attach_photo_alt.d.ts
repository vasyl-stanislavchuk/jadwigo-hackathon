/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Attach_Photo_AltInputs */
/**
* | output |
* | --- |
* | "Photo {n}" |
*
* @param {Attach_Photo_AltInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_photo_alt: ((inputs: Attach_Photo_AltInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Attach_Photo_AltInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Attach_Photo_AltInputs = {
    n: NonNullable<unknown>;
};
