/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ value: NonNullable<unknown> }} Number_Line_MarkerInputs */



/**
* | output |
* | --- |
* | "Marker at {value}" |
*
* @param {Number_Line_MarkerInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const number_line_marker = /** @type {((inputs: Number_Line_MarkerInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Number_Line_MarkerInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Marker at ${i?.value}`)
	return /** @type {LocalizedString} */ (`Znacznik na ${i?.value}`)
});