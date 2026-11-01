/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ category: NonNullable<unknown> }} Review_No_AnswerInputs */



/**
* | category | output |
* | --- | --- |
* | "adult" | "No answer given. The right answer is below." |
* | * | "No answer this time. Here is how it goes." |
*
* @param {Review_No_AnswerInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const review_no_answer = /** @type {((inputs: Review_No_AnswerInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Review_No_AnswerInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`No answer given. The right answer is below.`);
		return /** @type {LocalizedString} */ (`No answer this time. Here is how it goes.`)
	}
	{
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Bez odpowiedzi. Niżej dobra odpowiedź.`);
		return /** @type {LocalizedString} */ (`Tym razem bez odpowiedzi. Zobacz, jak to wygląda.`)
	}
});