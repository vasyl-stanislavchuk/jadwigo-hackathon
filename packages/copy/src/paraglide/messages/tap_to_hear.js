/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Tap_To_HearInputs */



/**
* | output |
* | --- |
* | "Tap to hear" |
*
* @param {Tap_To_HearInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const tap_to_hear = /** @type {((inputs?: Tap_To_HearInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Tap_To_HearInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Tap to hear")
	return /** @type {LocalizedString} */ ("Dotknij, żeby usłyszeć")
});