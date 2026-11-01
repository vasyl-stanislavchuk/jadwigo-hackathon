/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Code_PlaceholderInputs */



/**
* | output |
* | --- |
* | "In place of the part in angle brackets, type the ID that bd printed." |
*
* @param {Code_PlaceholderInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const code_placeholder = /** @type {((inputs?: Code_PlaceholderInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Code_PlaceholderInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("In place of the part in angle brackets, type the ID that bd printed.")
	return /** @type {LocalizedString} */ ("W miejsce części w nawiasach ostrych wpisz identyfikator, który wypisał bd")
});