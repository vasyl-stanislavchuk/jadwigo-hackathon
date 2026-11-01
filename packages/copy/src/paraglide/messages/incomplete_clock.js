/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Incomplete_ClockInputs */



/**
* | output |
* | --- |
* | "Move a hand first." |
*
* @param {Incomplete_ClockInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const incomplete_clock = /** @type {((inputs?: Incomplete_ClockInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Incomplete_ClockInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Move a hand first.")
	return /** @type {LocalizedString} */ ("Najpierw przesuń wskazówkę.")
});