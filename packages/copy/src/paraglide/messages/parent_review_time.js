/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ seconds: NonNullable<unknown> }} Parent_Review_TimeInputs */



/**
* | output |
* | --- |
* | "Time: {seconds} s" |
*
* @param {Parent_Review_TimeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_review_time = /** @type {((inputs: Parent_Review_TimeInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Review_TimeInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Time: ${i?.seconds} s`)
	return /** @type {LocalizedString} */ (`Czas: ${i?.seconds} s`)
});