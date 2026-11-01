/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Hands_SwappedInputs */



/**
* | output |
* | --- |
* | "The clock's hands swapped" |
*
* @param {Parent_Mistake_Hands_SwappedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_hands_swapped = /** @type {((inputs?: Parent_Mistake_Hands_SwappedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Hands_SwappedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The clock's hands swapped")
	return /** @type {LocalizedString} */ ("Zamienione wskazówki zegara")
});