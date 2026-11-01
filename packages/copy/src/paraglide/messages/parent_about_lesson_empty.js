/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_About_Lesson_EmptyInputs */



/**
* | output |
* | --- |
* | "The source, the steps, the version and the change history will appear here once the lesson is ready." |
*
* @param {Parent_About_Lesson_EmptyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_about_lesson_empty = /** @type {((inputs?: Parent_About_Lesson_EmptyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_About_Lesson_EmptyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The source, the steps, the version and the change history will appear here once the lesson is ready.")
	return /** @type {LocalizedString} */ ("Źródło, kroki, wersja i historia zmian pojawią się tu, gdy lekcja będzie gotowa.")
});