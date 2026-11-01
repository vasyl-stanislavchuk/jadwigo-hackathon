/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_One_Column_ShortInputs */



/**
* | output |
* | --- |
* | "One column too few" |
*
* @param {Parent_Mistake_One_Column_ShortInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_one_column_short = /** @type {((inputs?: Parent_Mistake_One_Column_ShortInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_One_Column_ShortInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("One column too few")
	return /** @type {LocalizedString} */ ("O jedną kolumnę za mało")
});