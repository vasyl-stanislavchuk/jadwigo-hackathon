/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_List_Failed_LineInputs */



/**
* | output |
* | --- |
* | "Check your connection. Your lessons are safe." |
*
* @param {Parent_List_Failed_LineInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_failed_line = /** @type {((inputs?: Parent_List_Failed_LineInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_List_Failed_LineInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Check your connection. Your lessons are safe.")
	return /** @type {LocalizedString} */ ("Sprawdź internet. Twoje lekcje są bezpieczne.")
});