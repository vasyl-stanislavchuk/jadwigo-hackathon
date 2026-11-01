/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Lesson_Skills_EmptyInputs */



/**
* | output |
* | --- |
* | "The skills this lesson practises will appear here once it is ready." |
*
* @param {Parent_Lesson_Skills_EmptyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_lesson_skills_empty = /** @type {((inputs?: Parent_Lesson_Skills_EmptyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Lesson_Skills_EmptyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The skills this lesson practises will appear here once it is ready.")
	return /** @type {LocalizedString} */ ("Umiejętności, które ćwiczy ta lekcja, pojawią się tu, gdy będzie gotowa.")
});