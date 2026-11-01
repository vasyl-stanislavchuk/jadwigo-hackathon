/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Answer_Card_Example_RightInputs */
/**
* | output |
* | --- |
* | "Mark like this" |
*
* @param {Answer_Card_Example_RightInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const answer_card_example_right: ((inputs?: Answer_Card_Example_RightInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Answer_Card_Example_RightInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Answer_Card_Example_RightInputs = {};
