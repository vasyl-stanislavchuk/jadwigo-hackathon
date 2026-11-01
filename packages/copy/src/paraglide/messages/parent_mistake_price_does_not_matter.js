/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Price_Does_Not_MatterInputs */



/**
* | output |
* | --- |
* | "The price left out of the comparison" |
*
* @param {Parent_Mistake_Price_Does_Not_MatterInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_price_does_not_matter = /** @type {((inputs?: Parent_Mistake_Price_Does_Not_MatterInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Price_Does_Not_MatterInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The price left out of the comparison")
	return /** @type {LocalizedString} */ ("Cena pominięta przy porównaniu")
});