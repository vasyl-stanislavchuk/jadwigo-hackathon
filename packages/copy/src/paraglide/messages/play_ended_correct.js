/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ category: NonNullable<unknown> }} Play_Ended_CorrectInputs */



/**
* | category | output |
* | --- | --- |
* | "adult" | "Right" |
* | * | "You got it!" |
*
* @param {Play_Ended_CorrectInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_ended_correct = /** @type {((inputs: Play_Ended_CorrectInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Play_Ended_CorrectInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Right`);
		return /** @type {LocalizedString} */ (`You got it!`)
	}
	{
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Dobrze`);
		return /** @type {LocalizedString} */ (`Udało się`)
	}
});