/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Child_Lessons_EmptyInputs */



/**
* | output |
* | --- |
* | "The lessons given to this child will appear here." |
*
* @param {Parent_Child_Lessons_EmptyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_child_lessons_empty = /** @type {((inputs?: Parent_Child_Lessons_EmptyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Child_Lessons_EmptyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The lessons given to this child will appear here.")
	return /** @type {LocalizedString} */ ("Tu pojawią się lekcje dane temu dziecku.")
});