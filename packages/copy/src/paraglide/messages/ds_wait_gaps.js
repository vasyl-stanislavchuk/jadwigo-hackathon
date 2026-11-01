/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Ds_Wait_GapsInputs */



/**
* | output |
* | --- |
* | "Fill in every digit of the result." |
*
* @param {Ds_Wait_GapsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_wait_gaps = /** @type {((inputs?: Ds_Wait_GapsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Ds_Wait_GapsInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Fill in every digit of the result.")
	return /** @type {LocalizedString} */ ("Wpisz wszystkie cyfry wyniku.")
});