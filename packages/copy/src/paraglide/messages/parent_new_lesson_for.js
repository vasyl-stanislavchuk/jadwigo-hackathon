/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ name: NonNullable<unknown> }} Parent_New_Lesson_ForInputs */



/**
* | output |
* | --- |
* | "New lesson for {name}" |
*
* @param {Parent_New_Lesson_ForInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_new_lesson_for = /** @type {((inputs: Parent_New_Lesson_ForInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_New_Lesson_ForInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`New lesson for ${i?.name}`)
	return /** @type {LocalizedString} */ (`Nowa lekcja dla: ${i?.name}`)
});