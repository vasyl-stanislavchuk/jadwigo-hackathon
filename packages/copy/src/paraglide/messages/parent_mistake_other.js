/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_OtherInputs */



/**
* | output |
* | --- |
* | "An answer other than the one we looked for" |
*
* @param {Parent_Mistake_OtherInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_other = /** @type {((inputs?: Parent_Mistake_OtherInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_OtherInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("An answer other than the one we looked for")
	return /** @type {LocalizedString} */ ("Inna odpowiedź niż ta, której szukaliśmy")
});