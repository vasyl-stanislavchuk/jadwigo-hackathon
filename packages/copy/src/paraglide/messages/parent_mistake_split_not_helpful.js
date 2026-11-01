/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Split_Not_HelpfulInputs */



/**
* | output |
* | --- |
* | "A split that does not make it easier" |
*
* @param {Parent_Mistake_Split_Not_HelpfulInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_split_not_helpful = /** @type {((inputs?: Parent_Mistake_Split_Not_HelpfulInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Split_Not_HelpfulInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("A split that does not make it easier")
	return /** @type {LocalizedString} */ ("Podział, który nie ułatwia liczenia")
});