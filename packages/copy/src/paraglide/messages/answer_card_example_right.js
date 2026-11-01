/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

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
export const answer_card_example_right = /** @type {((inputs?: Answer_Card_Example_RightInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Answer_Card_Example_RightInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Mark like this")
	return /** @type {LocalizedString} */ ("Tak zaznaczaj")
});