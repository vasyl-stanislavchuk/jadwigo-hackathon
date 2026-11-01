/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ source: NonNullable<unknown> }} Credit_FromInputs */



/**
* | output |
* | --- |
* | "from {source}" |
*
* @param {Credit_FromInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_from = /** @type {((inputs: Credit_FromInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Credit_FromInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`from ${i?.source}`)
	return /** @type {LocalizedString} */ (`z ${i?.source}`)
});