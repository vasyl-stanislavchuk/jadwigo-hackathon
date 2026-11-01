/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown>, d: NonNullable<unknown> }} Fraction_PartInputs */



/**
* | output |
* | --- |
* | "Part {n} of {d}" |
*
* @param {Fraction_PartInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const fraction_part = /** @type {((inputs: Fraction_PartInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Fraction_PartInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Part ${i?.n} of ${i?.d}`)
	return /** @type {LocalizedString} */ (`Część ${i?.n} z ${i?.d}`)
});