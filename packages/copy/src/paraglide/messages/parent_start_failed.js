/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Start_FailedInputs */



/**
* | output |
* | --- |
* | "The lesson didn't start. Try again." |
*
* @param {Parent_Start_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_start_failed = /** @type {((inputs?: Parent_Start_FailedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Start_FailedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The lesson didn't start. Try again.")
	return /** @type {LocalizedString} */ ("Nie udało się zacząć lekcji. Spróbuj jeszcze raz.")
});