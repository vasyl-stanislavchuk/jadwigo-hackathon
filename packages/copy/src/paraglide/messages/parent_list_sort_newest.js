/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_List_Sort_NewestInputs */



/**
* | output |
* | --- |
* | "Last, newest first" |
*
* @param {Parent_List_Sort_NewestInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_sort_newest = /** @type {((inputs?: Parent_List_Sort_NewestInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_List_Sort_NewestInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Last, newest first")
	return /** @type {LocalizedString} */ ("Ostatnio, od najnowszych")
});