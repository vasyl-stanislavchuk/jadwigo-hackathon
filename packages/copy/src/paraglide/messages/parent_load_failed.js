/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Load_FailedInputs */



/**
* | output |
* | --- |
* | "This didn't load. Reload the page to try again." |
*
* @param {Parent_Load_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_load_failed = /** @type {((inputs?: Parent_Load_FailedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Load_FailedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This didn't load. Reload the page to try again.")
	return /** @type {LocalizedString} */ ("Nie udało się wczytać. Odśwież stronę, żeby spróbować ponownie.")
});