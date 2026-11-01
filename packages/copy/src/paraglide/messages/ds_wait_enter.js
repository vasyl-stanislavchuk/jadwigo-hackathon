/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Ds_Wait_EnterInputs */



/**
* | output |
* | --- |
* | "Type or say the result." |
*
* @param {Ds_Wait_EnterInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_wait_enter = /** @type {((inputs?: Ds_Wait_EnterInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Ds_Wait_EnterInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Type or say the result.")
	return /** @type {LocalizedString} */ ("Wpisz albo powiedz wynik.")
});