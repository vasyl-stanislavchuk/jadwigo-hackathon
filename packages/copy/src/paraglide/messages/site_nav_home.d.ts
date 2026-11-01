/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Site_Nav_HomeInputs */
/**
* | output |
* | --- |
* | "Jadwigo, home page" |
*
* @param {Site_Nav_HomeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const site_nav_home: ((inputs?: Site_Nav_HomeInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Site_Nav_HomeInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Site_Nav_HomeInputs = {};
