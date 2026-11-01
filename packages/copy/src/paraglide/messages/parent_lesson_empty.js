/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Lesson_EmptyInputs */



/**
* | output |
* | --- |
* | "The lesson's steps will appear here once Jadwigo starts writing it." |
*
* @param {Parent_Lesson_EmptyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_lesson_empty = /** @type {((inputs?: Parent_Lesson_EmptyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Lesson_EmptyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The lesson's steps will appear here once Jadwigo starts writing it.")
	return /** @type {LocalizedString} */ ("Tu pojawią się kroki lekcji, gdy Jadwigo zacznie ją pisać.")
});