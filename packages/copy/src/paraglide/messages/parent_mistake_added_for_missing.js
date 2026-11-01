/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Added_For_MissingInputs */



/**
* | output |
* | --- |
* | "Added instead of finding the missing number" |
*
* @param {Parent_Mistake_Added_For_MissingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_added_for_missing = /** @type {((inputs?: Parent_Mistake_Added_For_MissingInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Added_For_MissingInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Added instead of finding the missing number")
	return /** @type {LocalizedString} */ ("Dodawanie zamiast szukania brakującej liczby")
});