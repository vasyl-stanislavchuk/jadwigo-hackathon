/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Ds_Wait_ChooseInputs */



/**
* | output |
* | --- |
* | "Tap one answer." |
*
* @param {Ds_Wait_ChooseInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_wait_choose = /** @type {((inputs?: Ds_Wait_ChooseInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Ds_Wait_ChooseInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Tap one answer.")
	return /** @type {LocalizedString} */ ("Dotknij jednej odpowiedzi.")
});