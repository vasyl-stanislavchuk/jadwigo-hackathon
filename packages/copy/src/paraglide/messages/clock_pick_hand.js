/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Clock_Pick_HandInputs */



/**
* | output |
* | --- |
* | "Which hand are you moving?" |
*
* @param {Clock_Pick_HandInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const clock_pick_hand = /** @type {((inputs?: Clock_Pick_HandInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Clock_Pick_HandInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Which hand are you moving?")
	return /** @type {LocalizedString} */ ("Którą wskazówkę przesuwasz?")
});