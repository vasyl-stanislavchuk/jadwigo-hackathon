/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Code_PlaceholderInputs */



/**
* | output |
* | --- |
* | "Type the id bd printed in place of the part in angle brackets" |
*
* @param {Code_PlaceholderInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const code_placeholder = /** @type {((inputs?: Code_PlaceholderInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Code_PlaceholderInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Type the id bd printed in place of the part in angle brackets")
	return /** @type {LocalizedString} */ ("W miejsce części w nawiasach ostrych wpisz identyfikator, który wypisał bd")
});