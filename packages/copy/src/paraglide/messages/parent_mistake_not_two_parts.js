/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Not_Two_PartsInputs */



/**
* | output |
* | --- |
* | "Not 2 equal parts" |
*
* @param {Parent_Mistake_Not_Two_PartsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_not_two_parts = /** @type {((inputs?: Parent_Mistake_Not_Two_PartsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Not_Two_PartsInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Not 2 equal parts")
	return /** @type {LocalizedString} */ ("Nie na dwie równe części")
});