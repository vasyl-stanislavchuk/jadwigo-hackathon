/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ min: NonNullable<unknown>, max: NonNullable<unknown> }} Number_Line_AxisInputs */



/**
* | output |
* | --- |
* | "Number line from {min} to {max}" |
*
* @param {Number_Line_AxisInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const number_line_axis = /** @type {((inputs: Number_Line_AxisInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Number_Line_AxisInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Number line from ${i?.min} to ${i?.max}`)
	return /** @type {LocalizedString} */ (`Oś liczbowa od ${i?.min} do ${i?.max}`)
});