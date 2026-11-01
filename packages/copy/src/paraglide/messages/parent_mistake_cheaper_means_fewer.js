/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Cheaper_Means_FewerInputs */



/**
* | output |
* | --- |
* | "Cheaper taken to mean fewer" |
*
* @param {Parent_Mistake_Cheaper_Means_FewerInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_cheaper_means_fewer = /** @type {((inputs?: Parent_Mistake_Cheaper_Means_FewerInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Cheaper_Means_FewerInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Cheaper taken to mean fewer")
	return /** @type {LocalizedString} */ ("Taniej wzięte za mniej sztuk")
});