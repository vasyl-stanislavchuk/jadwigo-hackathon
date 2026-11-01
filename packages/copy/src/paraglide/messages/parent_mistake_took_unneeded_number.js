/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Took_Unneeded_NumberInputs */



/**
* | output |
* | --- |
* | "A number used that the question did not need" |
*
* @param {Parent_Mistake_Took_Unneeded_NumberInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_took_unneeded_number = /** @type {((inputs?: Parent_Mistake_Took_Unneeded_NumberInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Took_Unneeded_NumberInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("A number used that the question did not need")
	return /** @type {LocalizedString} */ ("Użyta liczba, której pytanie nie potrzebowało")
});