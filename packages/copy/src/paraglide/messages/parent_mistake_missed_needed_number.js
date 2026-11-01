/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Missed_Needed_NumberInputs */



/**
* | output |
* | --- |
* | "A number left out that the question needed" |
*
* @param {Parent_Mistake_Missed_Needed_NumberInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_missed_needed_number = /** @type {((inputs?: Parent_Mistake_Missed_Needed_NumberInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Missed_Needed_NumberInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("A number left out that the question needed")
	return /** @type {LocalizedString} */ ("Pominięta liczba, której pytanie potrzebowało")
});