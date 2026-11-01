/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ minutes: NonNullable<unknown>, seconds: NonNullable<unknown> }} Parent_Review_Total_TimeInputs */



/**
* | output |
* | --- |
* | "{minutes} min {seconds} s" |
*
* @param {Parent_Review_Total_TimeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_review_total_time = /** @type {((inputs: Parent_Review_Total_TimeInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Review_Total_TimeInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.minutes} min ${i?.seconds} s`)
	return /** @type {LocalizedString} */ (`${i?.minutes} min ${i?.seconds} s`)
});