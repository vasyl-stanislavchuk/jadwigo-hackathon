/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown>, unit: NonNullable<unknown> }} Picture_Stands_ForInputs */



/**
* | output |
* | --- |
* | "One picture stands for {n} {unit}" |
*
* @param {Picture_Stands_ForInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const picture_stands_for = /** @type {((inputs: Picture_Stands_ForInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Picture_Stands_ForInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`One picture stands for ${i?.n} ${i?.unit}`)
	return /** @type {LocalizedString} */ (`Jeden obrazek to ${i?.n} ${i?.unit}`)
});