/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Lesson_ShowInputs */



/**
* | output |
* | --- |
* | "Show the lesson" |
*
* @param {Parent_Lesson_ShowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_lesson_show = /** @type {((inputs?: Parent_Lesson_ShowInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Lesson_ShowInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Show the lesson")
	return /** @type {LocalizedString} */ ("Pokaż lekcję")
});