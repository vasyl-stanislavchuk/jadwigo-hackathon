/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Ds_Close_TipInputs */



/**
* | output |
* | --- |
* | "Stop for today. Your progress is saved." |
*
* @param {Ds_Close_TipInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_close_tip = /** @type {((inputs?: Ds_Close_TipInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Ds_Close_TipInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Stop for today. Your progress is saved.")
	return /** @type {LocalizedString} */ ("Zakończ na dziś. Postęp się zapisze.")
});