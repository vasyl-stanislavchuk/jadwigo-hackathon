/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ app: NonNullable<unknown> }} Oauth_DataInputs */
/**
* | output |
* | --- |
* | "{app} will get your children's names, lessons and results." |
*
* @param {Oauth_DataInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const oauth_data: ((inputs: Oauth_DataInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Oauth_DataInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Oauth_DataInputs = {
    app: NonNullable<unknown>;
};
