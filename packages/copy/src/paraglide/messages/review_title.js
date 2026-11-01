/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown>, total: NonNullable<unknown> }} Review_TitleInputs */



/**
* | output |
* | --- |
* | "Question {n} of {total}" |
*
* @param {Review_TitleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const review_title = /** @type {((inputs: Review_TitleInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Review_TitleInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Question ${i?.n} of ${i?.total}`)
	return /** @type {LocalizedString} */ (`Pytanie ${i?.n} z ${i?.total}`)
});