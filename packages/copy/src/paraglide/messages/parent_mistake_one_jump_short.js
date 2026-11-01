/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_One_Jump_ShortInputs */



/**
* | output |
* | --- |
* | "One jump short" |
*
* @param {Parent_Mistake_One_Jump_ShortInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_one_jump_short = /** @type {((inputs?: Parent_Mistake_One_Jump_ShortInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_One_Jump_ShortInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("One jump short")
	return /** @type {LocalizedString} */ ("O jeden skok za mało")
});