/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ name: NonNullable<unknown> }} Parent_New_Lesson_ChildInputs */



/**
* | output |
* | --- |
* | "New lesson · {name}" |
*
* @param {Parent_New_Lesson_ChildInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_new_lesson_child = /** @type {((inputs: Parent_New_Lesson_ChildInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_New_Lesson_ChildInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`New lesson · ${i?.name}`)
	return /** @type {LocalizedString} */ (`Nowa lekcja · ${i?.name}`)
});