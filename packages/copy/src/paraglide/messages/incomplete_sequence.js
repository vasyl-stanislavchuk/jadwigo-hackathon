/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Incomplete_SequenceInputs */



/**
* | output |
* | --- |
* | "Fill every place first." |
*
* @param {Incomplete_SequenceInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const incomplete_sequence = /** @type {((inputs?: Incomplete_SequenceInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Incomplete_SequenceInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Fill every place first.")
	return /** @type {LocalizedString} */ ("Najpierw zapełnij każde miejsce.")
});