/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Attach_OfflineInputs */
/**
* | output |
* | --- |
* | "The photo did not get through. Check the connection and try again" |
*
* @param {Attach_OfflineInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_offline: ((inputs?: Attach_OfflineInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Attach_OfflineInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Attach_OfflineInputs = {};
