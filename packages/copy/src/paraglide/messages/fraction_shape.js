/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ d: NonNullable<unknown> }} Fraction_ShapeInputs */



/**
* | output |
* | --- |
* | "A shape cut into {d} equal parts" |
*
* @param {Fraction_ShapeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const fraction_shape = /** @type {((inputs: Fraction_ShapeInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Fraction_ShapeInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`A shape cut into ${i?.d} equal parts`)
	return /** @type {LocalizedString} */ (`Figura do zamalowania, równe części: ${i?.d}`)
});