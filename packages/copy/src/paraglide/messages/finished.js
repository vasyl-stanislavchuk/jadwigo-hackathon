/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ category: NonNullable<unknown> }} FinishedInputs */



/**
* | category | output |
* | --- | --- |
* | "adult" | "That's the lesson done. Thank you!" |
* | * | "That's all for today. Thank you!" |
*
* @param {FinishedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const finished = /** @type {((inputs: FinishedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<FinishedInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`That's the lesson done. Thank you!`);
		return /** @type {LocalizedString} */ (`That's all for today. Thank you!`)
	}
	{
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`To koniec lekcji. Dziękuję!`);
		return /** @type {LocalizedString} */ (`To już wszystko na dziś. Dziękuję!`)
	}
});