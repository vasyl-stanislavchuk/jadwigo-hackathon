/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Solution_TapInputs */



/**
* | output |
* | --- |
* | "Now tap the letter from the solution." |
*
* @param {Solution_TapInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const solution_tap = /** @type {((inputs?: Solution_TapInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Solution_TapInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Now tap the letter from the solution.")
	return /** @type {LocalizedString} */ ("Teraz dotknij litery z rozwiązania.")
});