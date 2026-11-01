/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ source: NonNullable<unknown> }} Credit_Not_AffiliatedInputs */



/**
* | output |
* | --- |
* | "Jadwigo is not affiliated with {source}." |
*
* @param {Credit_Not_AffiliatedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_not_affiliated = /** @type {((inputs: Credit_Not_AffiliatedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Credit_Not_AffiliatedInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Jadwigo is not affiliated with ${i?.source}.`)
	return /** @type {LocalizedString} */ (`Jadwigo nie jest związane z ${i?.source}`)
});