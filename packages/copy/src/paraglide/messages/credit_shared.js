/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ licence: NonNullable<unknown> }} Credit_SharedInputs */



/**
* | output |
* | --- |
* | "Shared under {licence}" |
*
* @param {Credit_SharedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_shared = /** @type {((inputs: Credit_SharedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Credit_SharedInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Shared under ${i?.licence}`)
	return /** @type {LocalizedString} */ (`Udostępnione na licencji ${i?.licence}`)
});