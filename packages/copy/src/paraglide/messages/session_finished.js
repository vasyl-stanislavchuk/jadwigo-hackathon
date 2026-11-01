/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ category: NonNullable<unknown> }} Session_FinishedInputs */



/**
* | category | output |
* | --- | --- |
* | "adult" | "This lesson is finished. You can start it again." |
* | * | "This lesson is finished. Thank you for practicing!" |
*
* @param {Session_FinishedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const session_finished = /** @type {((inputs: Session_FinishedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Session_FinishedInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`This lesson is finished. You can start it again.`);
		return /** @type {LocalizedString} */ (`This lesson is finished. Thank you for practicing!`)
	}
	{
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Ta lekcja jest zakończona. Możesz zacząć ją od nowa.`);
		return /** @type {LocalizedString} */ (`Ta lekcja już się skończyła. Dziękuję za ćwiczenie!`)
	}
});