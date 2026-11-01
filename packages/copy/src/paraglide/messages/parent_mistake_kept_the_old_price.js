/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Kept_The_Old_PriceInputs */



/**
* | output |
* | --- |
* | "The old price kept" |
*
* @param {Parent_Mistake_Kept_The_Old_PriceInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_kept_the_old_price = /** @type {((inputs?: Parent_Mistake_Kept_The_Old_PriceInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Kept_The_Old_PriceInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The old price kept")
	return /** @type {LocalizedString} */ ("Została stara cena")
});