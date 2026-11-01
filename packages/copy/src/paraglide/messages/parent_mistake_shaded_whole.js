/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Shaded_WholeInputs */



/**
* | output |
* | --- |
* | "The whole shape shaded" |
*
* @param {Parent_Mistake_Shaded_WholeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_shaded_whole = /** @type {((inputs?: Parent_Mistake_Shaded_WholeInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Shaded_WholeInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The whole shape shaded")
	return /** @type {LocalizedString} */ ("Zamalowana cała figura")
});