/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Off_By_One_UnitInputs */



/**
* | output |
* | --- |
* | "One unit away" |
*
* @param {Parent_Mistake_Off_By_One_UnitInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_off_by_one_unit = /** @type {((inputs?: Parent_Mistake_Off_By_One_UnitInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Off_By_One_UnitInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("One unit away")
	return /** @type {LocalizedString} */ ("O jedną jednostkę obok")
});