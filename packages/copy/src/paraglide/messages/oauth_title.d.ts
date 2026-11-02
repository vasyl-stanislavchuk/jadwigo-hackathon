/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ app: NonNullable<unknown> }} Oauth_TitleInputs */
/**
* | output |
* | --- |
* | "Connect {app} to Jadwigo" |
*
* @param {Oauth_TitleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const oauth_title: ((inputs: Oauth_TitleInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Oauth_TitleInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Oauth_TitleInputs = {
    app: NonNullable<unknown>;
};
