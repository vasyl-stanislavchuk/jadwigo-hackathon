/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_One_MisplacedInputs */



/**
* | output |
* | --- |
* | "One piece in another place" |
*
* @param {Parent_Mistake_One_MisplacedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_one_misplaced = /** @type {((inputs?: Parent_Mistake_One_MisplacedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_One_MisplacedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("One piece in another place")
	return /** @type {LocalizedString} */ ("Jeden element w innym miejscu")
});