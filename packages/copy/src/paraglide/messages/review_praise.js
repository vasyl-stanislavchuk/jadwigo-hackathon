/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ category: NonNullable<unknown> }} Review_PraiseInputs */



/**
* | category | output |
* | --- | --- |
* | "adult" | "Why it is right:" |
* | * | "Well done! Here is why it works." |
*
* @param {Review_PraiseInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const review_praise = /** @type {((inputs: Review_PraiseInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Review_PraiseInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Why it is right:`);
		return /** @type {LocalizedString} */ (`Well done! Here is why it works.`)
	}
	{
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Dlaczego tak:`);
		return /** @type {LocalizedString} */ (`Brawo! Oto dlaczego:`)
	}
});