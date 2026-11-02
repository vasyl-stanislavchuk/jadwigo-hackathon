/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Give_UnavailableInputs */



/**
* | output |
* | --- |
* | "Giving a lesson works once you're signed in." |
*
* @param {Parent_Give_UnavailableInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_give_unavailable = /** @type {((inputs?: Parent_Give_UnavailableInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Give_UnavailableInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Giving a lesson works once you're signed in.")
	return /** @type {LocalizedString} */ ("Dawanie lekcji zadziała po zalogowaniu.")
});