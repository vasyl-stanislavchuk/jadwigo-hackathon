/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Lesson_UntitledInputs */



/**
* | output |
* | --- |
* | "Untitled lesson" |
*
* @param {Parent_Lesson_UntitledInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_lesson_untitled = /** @type {((inputs?: Parent_Lesson_UntitledInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Lesson_UntitledInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Untitled lesson")
	return /** @type {LocalizedString} */ ("Lekcja bez tytułu")
});