/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Shaded_The_RestInputs */



/**
* | output |
* | --- |
* | "The other parts shaded" |
*
* @param {Parent_Mistake_Shaded_The_RestInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_shaded_the_rest = /** @type {((inputs?: Parent_Mistake_Shaded_The_RestInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Shaded_The_RestInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The other parts shaded")
	return /** @type {LocalizedString} */ ("Zamalowana pozostała część")
});