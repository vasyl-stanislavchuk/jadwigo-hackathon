/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Outcome_Not_YetInputs */



/**
* | output |
* | --- |
* | "Not yet" |
*
* @param {Parent_Outcome_Not_YetInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_outcome_not_yet = /** @type {((inputs?: Parent_Outcome_Not_YetInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Outcome_Not_YetInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Not yet")
	return /** @type {LocalizedString} */ ("Jeszcze nie")
});