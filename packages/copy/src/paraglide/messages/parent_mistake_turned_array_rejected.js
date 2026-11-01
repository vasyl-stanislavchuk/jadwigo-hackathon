/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Turned_Array_RejectedInputs */



/**
* | output |
* | --- |
* | "A turned array taken for a different one" |
*
* @param {Parent_Mistake_Turned_Array_RejectedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_turned_array_rejected = /** @type {((inputs?: Parent_Mistake_Turned_Array_RejectedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Turned_Array_RejectedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("A turned array taken for a different one")
	return /** @type {LocalizedString} */ ("Obrócony układ kropek wzięty za inny")
});