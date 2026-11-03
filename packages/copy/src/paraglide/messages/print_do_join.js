/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Print_Do_JoinInputs */



/**
* | output |
* | --- |
* | "Join the ones that go together with lines." |
*
* @param {Print_Do_JoinInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const print_do_join = /** @type {((inputs?: Print_Do_JoinInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Print_Do_JoinInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Join the ones that go together with lines.")
	return /** @type {LocalizedString} */ ("Połącz liniami to, co do siebie pasuje.")
});