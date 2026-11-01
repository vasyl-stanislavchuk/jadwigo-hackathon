/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Incomplete_GapsInputs */



/**
* | output |
* | --- |
* | "Fill in the empty spaces too." |
*
* @param {Incomplete_GapsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const incomplete_gaps = /** @type {((inputs?: Incomplete_GapsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Incomplete_GapsInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Fill in the empty spaces too.")
	return /** @type {LocalizedString} */ ("Uzupełnij jeszcze puste miejsca.")
});