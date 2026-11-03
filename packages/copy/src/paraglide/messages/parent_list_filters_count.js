/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Parent_List_Filters_CountInputs */



/**
* | output |
* | --- |
* | "Filters ({n})" |
*
* @param {Parent_List_Filters_CountInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_filters_count = /** @type {((inputs: Parent_List_Filters_CountInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_List_Filters_CountInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Filters (${i?.n})`)
	return /** @type {LocalizedString} */ (`Filtry (${i?.n})`)
});