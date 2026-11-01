/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ licence: NonNullable<unknown> }} Credit_BothInputs */



/**
* | output |
* | --- |
* | "Translated and adapted by Jadwigo under {licence}" |
*
* @param {Credit_BothInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_both = /** @type {((inputs: Credit_BothInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Credit_BothInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Translated and adapted by Jadwigo under ${i?.licence}`)
	return /** @type {LocalizedString} */ (`Przetłumaczone i dostosowane przez Jadwigo na licencji ${i?.licence}`)
});