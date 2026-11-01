/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_PlaceholderInputs */



/**
* | output |
* | --- |
* | "E.g. Subtracting across 10. She found 15 − 7 and 12 − 5 hard." |
*
* @param {Parent_PlaceholderInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_placeholder = /** @type {((inputs?: Parent_PlaceholderInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_PlaceholderInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("E.g. Subtracting across 10. She found 15 − 7 and 12 − 5 hard.")
	return /** @type {LocalizedString} */ ("Np. Odejmowanie przez 10. Pomyliła się w 15 − 7 i 12 − 5.")
});