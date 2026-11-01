/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ day: NonNullable<unknown> }} Parent_Week_OfInputs */



/**
* | output |
* | --- |
* | "Week of {day}" |
*
* @param {Parent_Week_OfInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_week_of = /** @type {((inputs: Parent_Week_OfInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Week_OfInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Week of ${i?.day}`)
	return /** @type {LocalizedString} */ (`Tydzień od ${i?.day}`)
});