/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Ds_End_SimilarInputs */



/**
* | output |
* | --- |
* | "Similar ones to practise" |
*
* @param {Ds_End_SimilarInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_end_similar = /** @type {((inputs?: Ds_End_SimilarInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Ds_End_SimilarInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Similar ones to practise")
	return /** @type {LocalizedString} */ ("Podobne pytania do ćwiczenia")
});