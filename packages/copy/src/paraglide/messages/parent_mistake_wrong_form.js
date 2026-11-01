/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Wrong_FormInputs */



/**
* | output |
* | --- |
* | "The value in another form than the question asked" |
*
* @param {Parent_Mistake_Wrong_FormInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_wrong_form = /** @type {((inputs?: Parent_Mistake_Wrong_FormInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Wrong_FormInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The value in another form than the question asked")
	return /** @type {LocalizedString} */ ("Wartość w innej postaci, niż prosiło pytanie")
});