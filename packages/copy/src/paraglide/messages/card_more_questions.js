/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Card_More_QuestionsInputs */



/**
* | output |
* | --- |
* | "+{n} more" |
*
* @param {Card_More_QuestionsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const card_more_questions = /** @type {((inputs: Card_More_QuestionsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Card_More_QuestionsInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`+${i?.n} more`)
	return /** @type {LocalizedString} */ (`+${i?.n} więcej`)
});