/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Outcome_Not_AskedInputs */



/**
* | output |
* | --- |
* | "Not asked" |
*
* @param {Parent_Outcome_Not_AskedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_outcome_not_asked = /** @type {((inputs?: Parent_Outcome_Not_AskedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Outcome_Not_AskedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Not asked")
	return /** @type {LocalizedString} */ ("Nie zadane")
});