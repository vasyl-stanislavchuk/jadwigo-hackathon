/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ licence: NonNullable<unknown> }} Credit_TranslatedInputs */



/**
* | output |
* | --- |
* | "Translated into English by Jadwigo under {licence}" |
*
* @param {Credit_TranslatedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_translated = /** @type {((inputs: Credit_TranslatedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Credit_TranslatedInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Translated into English by Jadwigo under ${i?.licence}`)
	return /** @type {LocalizedString} */ (`Przetłumaczone na polski przez Jadwigo na licencji ${i?.licence}`)
});