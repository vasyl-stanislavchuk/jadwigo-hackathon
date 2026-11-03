/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ from: NonNullable<unknown>, to: NonNullable<unknown>, total: NonNullable<unknown> }} Parent_List_RangeInputs */



/**
* | output |
* | --- |
* | "{from}–{to} of {total}" |
*
* @param {Parent_List_RangeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_range = /** @type {((inputs: Parent_List_RangeInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_List_RangeInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.from}–${i?.to} of ${i?.total}`)
	return /** @type {LocalizedString} */ (`${i?.from}–${i?.to} z ${i?.total}`)
});