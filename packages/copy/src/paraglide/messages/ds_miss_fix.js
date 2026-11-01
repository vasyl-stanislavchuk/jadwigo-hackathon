/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Ds_Miss_FixInputs */



/**
* | output |
* | --- |
* | "Fix the marked part." |
*
* @param {Ds_Miss_FixInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_miss_fix = /** @type {((inputs?: Ds_Miss_FixInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Ds_Miss_FixInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Fix the marked part.")
	return /** @type {LocalizedString} */ ("Popraw zaznaczone miejsce.")
});