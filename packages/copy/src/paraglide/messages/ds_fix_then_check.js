/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Ds_Fix_Then_CheckInputs */



/**
* | output |
* | --- |
* | "Fix the marked place, then check." |
*
* @param {Ds_Fix_Then_CheckInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_fix_then_check = /** @type {((inputs?: Ds_Fix_Then_CheckInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Ds_Fix_Then_CheckInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Fix the marked place, then check.")
	return /** @type {LocalizedString} */ ("Popraw zaznaczone miejsce, potem sprawdź.")
});