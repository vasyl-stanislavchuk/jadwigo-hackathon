/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Off_By_One_PartInputs */



/**
* | output |
* | --- |
* | "One part too many or too few" |
*
* @param {Parent_Mistake_Off_By_One_PartInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_off_by_one_part = /** @type {((inputs?: Parent_Mistake_Off_By_One_PartInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Off_By_One_PartInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("One part too many or too few")
	return /** @type {LocalizedString} */ ("O jedną część za dużo lub za mało")
});