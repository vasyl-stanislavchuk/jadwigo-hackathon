/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Title_FailedInputs */



/**
* | output |
* | --- |
* | "The title did not change. Try again." |
*
* @param {Parent_Title_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_title_failed = /** @type {((inputs?: Parent_Title_FailedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Title_FailedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The title did not change. Try again.")
	return /** @type {LocalizedString} */ ("Nie udało się zmienić tytułu. Spróbuj jeszcze raz.")
});