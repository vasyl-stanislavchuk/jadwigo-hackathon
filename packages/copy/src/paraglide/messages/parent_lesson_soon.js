/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Lesson_SoonInputs */



/**
* | output |
* | --- |
* | "Making a lesson from here is on its way. It will work soon." |
*
* @param {Parent_Lesson_SoonInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_lesson_soon = /** @type {((inputs?: Parent_Lesson_SoonInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Lesson_SoonInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Making a lesson from here is on its way. It will work soon.")
	return /** @type {LocalizedString} */ ("Robienie lekcji z tego miejsca jest w drodze. Wkrótce zadziała.")
});