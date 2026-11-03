/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Print_Do_TickInputs */



/**
* | output |
* | --- |
* | "Tick ✓ every right answer." |
*
* @param {Print_Do_TickInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const print_do_tick = /** @type {((inputs?: Print_Do_TickInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Print_Do_TickInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Tick ✓ every right answer.")
	return /** @type {LocalizedString} */ ("Zaznacz ✓ każdą dobrą odpowiedź.")
});