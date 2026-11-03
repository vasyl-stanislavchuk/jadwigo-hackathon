/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ grade: NonNullable<unknown> }} Parent_Grade_NInputs */



/**
* | output |
* | --- |
* | "grade {grade}" |
*
* @param {Parent_Grade_NInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_grade_n = /** @type {((inputs: Parent_Grade_NInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Grade_NInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`grade ${i?.grade}`)
	return /** @type {LocalizedString} */ (`klasa ${i?.grade}`)
});