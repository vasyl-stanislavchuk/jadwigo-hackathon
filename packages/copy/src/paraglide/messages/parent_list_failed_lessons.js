/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_List_Failed_LessonsInputs */



/**
* | output |
* | --- |
* | "Couldn't load the lessons" |
*
* @param {Parent_List_Failed_LessonsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_failed_lessons = /** @type {((inputs?: Parent_List_Failed_LessonsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_List_Failed_LessonsInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Couldn't load the lessons")
	return /** @type {LocalizedString} */ ("Nie udało się wczytać lekcji")
});