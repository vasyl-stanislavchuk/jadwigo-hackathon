/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Off_By_SmallInputs */



/**
* | output |
* | --- |
* | "Very close: 1 or 2 away" |
*
* @param {Parent_Mistake_Off_By_SmallInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_off_by_small = /** @type {((inputs?: Parent_Mistake_Off_By_SmallInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Off_By_SmallInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Very close: 1 or 2 away")
	return /** @type {LocalizedString} */ ("Bardzo blisko: różnica 1 lub 2")
});