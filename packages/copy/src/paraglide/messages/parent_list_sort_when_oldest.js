/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_List_Sort_When_OldestInputs */



/**
* | output |
* | --- |
* | "When, oldest first" |
*
* @param {Parent_List_Sort_When_OldestInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_sort_when_oldest = /** @type {((inputs?: Parent_List_Sort_When_OldestInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_List_Sort_When_OldestInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("When, oldest first")
	return /** @type {LocalizedString} */ ("Kiedy, od najstarszych")
});