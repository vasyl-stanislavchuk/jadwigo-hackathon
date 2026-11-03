/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Print_Hours_HandInputs */



/**
* | output |
* | --- |
* | "The short hand shows the hours." |
*
* @param {Print_Hours_HandInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const print_hours_hand = /** @type {((inputs?: Print_Hours_HandInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Print_Hours_HandInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The short hand shows the hours.")
	return /** @type {LocalizedString} */ ("Krótka wskazówka pokazuje godziny.")
});