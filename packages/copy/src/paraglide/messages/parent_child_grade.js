/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ grade: NonNullable<unknown> }} Parent_Child_GradeInputs */



/**
* | output |
* | --- |
* | "Year {grade}" |
*
* @param {Parent_Child_GradeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_child_grade = /** @type {((inputs: Parent_Child_GradeInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Child_GradeInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Year ${i?.grade}`)
	return /** @type {LocalizedString} */ (`${i?.grade} kl.`)
});