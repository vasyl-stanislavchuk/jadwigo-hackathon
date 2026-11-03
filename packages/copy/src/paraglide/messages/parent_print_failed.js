/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Print_FailedInputs */



/**
* | output |
* | --- |
* | "The sheet could not be prepared. Please try again." |
*
* @param {Parent_Print_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_print_failed = /** @type {((inputs?: Parent_Print_FailedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Print_FailedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The sheet could not be prepared. Please try again.")
	return /** @type {LocalizedString} */ ("Nie udało się przygotować kartki. Spróbuj jeszcze raz.")
});