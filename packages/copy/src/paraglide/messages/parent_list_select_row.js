/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ title: NonNullable<unknown> }} Parent_List_Select_RowInputs */



/**
* | output |
* | --- |
* | "Select: {title}" |
*
* @param {Parent_List_Select_RowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_select_row = /** @type {((inputs: Parent_List_Select_RowInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_List_Select_RowInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Select: ${i?.title}`)
	return /** @type {LocalizedString} */ (`Zaznacz: ${i?.title}`)
});