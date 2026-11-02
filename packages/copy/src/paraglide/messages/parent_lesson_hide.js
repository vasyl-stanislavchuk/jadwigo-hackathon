/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Lesson_HideInputs */



/**
* | output |
* | --- |
* | "Hide the lesson" |
*
* @param {Parent_Lesson_HideInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_lesson_hide = /** @type {((inputs?: Parent_Lesson_HideInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Lesson_HideInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Hide the lesson")
	return /** @type {LocalizedString} */ ("Ukryj lekcję")
});