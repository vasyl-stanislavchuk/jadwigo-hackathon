/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ label: NonNullable<unknown>, value: NonNullable<unknown>, unit: NonNullable<unknown> }} Bar_HeightInputs */



/**
* | output |
* | --- |
* | "{label}: {value} {unit}" |
*
* @param {Bar_HeightInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const bar_height = /** @type {((inputs: Bar_HeightInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Bar_HeightInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.label}: ${i?.value} ${i?.unit}`)
	return /** @type {LocalizedString} */ (`${i?.label}: ${i?.value} ${i?.unit}`)
});