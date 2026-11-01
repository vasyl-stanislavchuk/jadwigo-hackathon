/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

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
export const answer_card_example_wrong = /** @type {((inputs?: Answer_Card_Example_WrongInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Answer_Card_Example_WrongInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Not like this")
	return /** @type {LocalizedString} */ ("Tak nie zaznaczaj")
});