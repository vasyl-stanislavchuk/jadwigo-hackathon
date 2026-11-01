/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Answer_YoursInputs */
/**
* | output |
* | --- |
* | "Your answer" |
*
* @param {Answer_YoursInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const answer_yours: ((inputs?: Answer_YoursInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Answer_YoursInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Answer_YoursInputs = {};
