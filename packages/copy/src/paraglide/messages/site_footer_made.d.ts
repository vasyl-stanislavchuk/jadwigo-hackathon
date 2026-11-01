/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Site_Footer_MadeInputs */
/**
* | output |
* | --- |
* | "Jadwigo was built at the Meta hackathon." |
*
* @param {Site_Footer_MadeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const site_footer_made: ((inputs?: Site_Footer_MadeInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Site_Footer_MadeInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Site_Footer_MadeInputs = {};
