/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Give_Refused_ChangedInputs */



/**
* | output |
* | --- |
* | "The lesson changed since its last check. Wait for Jadwigo to check it, then try again." |
*
* @param {Parent_Give_Refused_ChangedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_give_refused_changed = /** @type {((inputs?: Parent_Give_Refused_ChangedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Give_Refused_ChangedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The lesson changed since its last check. Wait for Jadwigo to check it, then try again.")
	return /** @type {LocalizedString} */ ("Lekcja zmieniła się od ostatniego sprawdzenia. Poczekaj, aż Jadwigo ją sprawdzi, i spróbuj znowu.")
});