/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_List_Clear_FiltersInputs */



/**
* | output |
* | --- |
* | "Clear filters" |
*
* @param {Parent_List_Clear_FiltersInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_clear_filters = /** @type {((inputs?: Parent_List_Clear_FiltersInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_List_Clear_FiltersInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Clear filters")
	return /** @type {LocalizedString} */ ("Wyczyść filtry")
});