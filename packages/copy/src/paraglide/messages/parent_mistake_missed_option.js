/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Missed_OptionInputs */



/**
* | output |
* | --- |
* | "An option that fits left out" |
*
* @param {Parent_Mistake_Missed_OptionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_missed_option = /** @type {((inputs?: Parent_Mistake_Missed_OptionInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Missed_OptionInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("An option that fits left out")
	return /** @type {LocalizedString} */ ("Pominięta pasująca odpowiedź")
});