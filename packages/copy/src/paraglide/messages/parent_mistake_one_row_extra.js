/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_One_Row_ExtraInputs */



/**
* | output |
* | --- |
* | "One row too many" |
*
* @param {Parent_Mistake_One_Row_ExtraInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_one_row_extra = /** @type {((inputs?: Parent_Mistake_One_Row_ExtraInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_One_Row_ExtraInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("One row too many")
	return /** @type {LocalizedString} */ ("O jeden rząd za dużo")
});