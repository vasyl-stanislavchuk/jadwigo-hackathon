/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Review_Right_AnswerInputs */



/**
* | output |
* | --- |
* | "This is what the right answer looks like." |
*
* @param {Review_Right_AnswerInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const review_right_answer = /** @type {((inputs?: Review_Right_AnswerInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Review_Right_AnswerInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This is what the right answer looks like.")
	return /** @type {LocalizedString} */ ("Tak wygląda dobra odpowiedź:")
});