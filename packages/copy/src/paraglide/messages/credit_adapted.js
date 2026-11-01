/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ licence: NonNullable<unknown> }} Credit_AdaptedInputs */



/**
* | output |
* | --- |
* | "Adapted by Jadwigo under {licence}" |
*
* @param {Credit_AdaptedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_adapted = /** @type {((inputs: Credit_AdaptedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Credit_AdaptedInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Adapted by Jadwigo under ${i?.licence}`)
	return /** @type {LocalizedString} */ (`Dostosowane przez Jadwigo na licencji ${i?.licence}`)
});