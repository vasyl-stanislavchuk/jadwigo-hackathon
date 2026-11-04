/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Crash_TextInputs */



/**
* | output |
* | --- |
* | "It's not your fault. Let's start again." |
*
* @param {Crash_TextInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const crash_text = /** @type {((inputs?: Crash_TextInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Crash_TextInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("It's not your fault. Let's start again.")
	return /** @type {LocalizedString} */ ("To nie Twoja wina. Zaczniemy jeszcze raz.")
});