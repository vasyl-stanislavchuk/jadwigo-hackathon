/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Give_FailedInputs */



/**
* | output |
* | --- |
* | "We couldn't give the lesson. Try again." |
*
* @param {Parent_Give_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_give_failed = /** @type {((inputs?: Parent_Give_FailedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Give_FailedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("We couldn't give the lesson. Try again.")
	return /** @type {LocalizedString} */ ("Nie udało się dać lekcji. Spróbuj jeszcze raz.")
});