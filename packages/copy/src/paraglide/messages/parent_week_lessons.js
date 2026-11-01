/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Parent_Week_LessonsInputs */



/**
* | output |
* | --- |
* | "Lessons: {n}" |
*
* @param {Parent_Week_LessonsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_week_lessons = /** @type {((inputs: Parent_Week_LessonsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Week_LessonsInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Lessons: ${i?.n}`)
	return /** @type {LocalizedString} */ (`Lekcje: ${i?.n}`)
});