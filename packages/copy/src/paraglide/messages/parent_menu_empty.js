/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Menu_EmptyInputs */



/**
* | output |
* | --- |
* | "Lessons and history appear here after the first lesson." |
*
* @param {Parent_Menu_EmptyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_menu_empty = /** @type {((inputs?: Parent_Menu_EmptyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Menu_EmptyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Lessons and history appear here after the first lesson.")
	return /** @type {LocalizedString} */ ("Lekcje i historia pojawią się tu po pierwszej lekcji.")
});