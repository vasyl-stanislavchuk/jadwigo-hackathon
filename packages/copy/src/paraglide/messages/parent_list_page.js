/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ page: NonNullable<unknown>, pages: NonNullable<unknown> }} Parent_List_PageInputs */



/**
* | output |
* | --- |
* | "Page {page} of {pages}" |
*
* @param {Parent_List_PageInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_page = /** @type {((inputs: Parent_List_PageInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_List_PageInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Page ${i?.page} of ${i?.pages}`)
	return /** @type {LocalizedString} */ (`Strona ${i?.page} z ${i?.pages}`)
});