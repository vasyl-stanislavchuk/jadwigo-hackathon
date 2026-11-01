/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Skip_Asked_To_SkipInputs */



/**
* | output |
* | --- |
* | "Moved on without answering" |
*
* @param {Parent_Skip_Asked_To_SkipInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_skip_asked_to_skip = /** @type {((inputs?: Parent_Skip_Asked_To_SkipInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Skip_Asked_To_SkipInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Moved on without answering")
	return /** @type {LocalizedString} */ ("Dalej bez odpowiedzi")
});