/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ form: NonNullable<unknown> }} Sides_Swapped_FormInputs */



/**
* | output |
* | --- |
* | "Or: {form}" |
*
* @param {Sides_Swapped_FormInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const sides_swapped_form = /** @type {((inputs: Sides_Swapped_FormInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Sides_Swapped_FormInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Or: ${i?.form}`)
	return /** @type {LocalizedString} */ (`Albo: ${i?.form}`)
});