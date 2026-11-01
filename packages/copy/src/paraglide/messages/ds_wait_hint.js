/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Ds_Wait_HintInputs */



/**
* | output |
* | --- |
* | "Answer first, then check." |
*
* @param {Ds_Wait_HintInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_wait_hint = /** @type {((inputs?: Ds_Wait_HintInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Ds_Wait_HintInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Answer first, then check.")
	return /** @type {LocalizedString} */ ("Najpierw odpowiedz, potem sprawdź.")
});