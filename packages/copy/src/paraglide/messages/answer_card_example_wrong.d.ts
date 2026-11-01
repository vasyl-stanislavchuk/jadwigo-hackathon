/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Answer_Card_Example_WrongInputs */
/**
* | output |
* | --- |
* | "Not like this" |
*
* @param {Answer_Card_Example_WrongInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const answer_card_example_wrong: ((inputs?: Answer_Card_Example_WrongInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Answer_Card_Example_WrongInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Answer_Card_Example_WrongInputs = {};
