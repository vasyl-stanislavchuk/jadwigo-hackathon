/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_UnsimplifiedInputs */



/**
* | output |
* | --- |
* | "The right value, not simplified yet" |
*
* @param {Parent_Mistake_UnsimplifiedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_unsimplified = /** @type {((inputs?: Parent_Mistake_UnsimplifiedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_UnsimplifiedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The right value, not simplified yet")
	return /** @type {LocalizedString} */ ("Dobra wartość, jeszcze nieskrócona")
});