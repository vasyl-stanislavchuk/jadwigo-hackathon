/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Moved_On_CalmInputs */
/**
* | output |
* | --- |
* | "That's fine. Let's look at how it works." |
*
* @param {Moved_On_CalmInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const moved_on_calm: ((inputs?: Moved_On_CalmInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Moved_On_CalmInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Moved_On_CalmInputs = {};
