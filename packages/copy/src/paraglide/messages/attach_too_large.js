/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Attach_Too_LargeInputs */



/**
* | output |
* | --- |
* | "This photo is too large even after shrinking it. Take a screenshot and add that instead" |
*
* @param {Attach_Too_LargeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_too_large = /** @type {((inputs?: Attach_Too_LargeInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Attach_Too_LargeInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This photo is too large even after shrinking it. Take a screenshot and add that instead")
	return /** @type {LocalizedString} */ ("To zdjęcie jest za duże nawet po zmniejszeniu. Zrób zrzut ekranu i dodaj go zamiast zdjęcia")
});