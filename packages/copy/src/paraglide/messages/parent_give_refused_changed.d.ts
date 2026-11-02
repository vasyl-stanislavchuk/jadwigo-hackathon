/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Give_Refused_ChangedInputs */
/**
* | output |
* | --- |
* | "The lesson changed since its last check. Wait for Jadwigo to check it, then try again." |
*
* @param {Parent_Give_Refused_ChangedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_give_refused_changed: ((inputs?: Parent_Give_Refused_ChangedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Give_Refused_ChangedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Give_Refused_ChangedInputs = {};
