/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Gap_SwapInputs */



/**
* | output |
* | --- |
* | "A swap of the answers in 2 blanks" |
*
* @param {Parent_Mistake_Gap_SwapInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_gap_swap = /** @type {((inputs?: Parent_Mistake_Gap_SwapInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Gap_SwapInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("A swap of the answers in 2 blanks")
	return /** @type {LocalizedString} */ ("Zamienione odpowiedzi w dwóch lukach")
});