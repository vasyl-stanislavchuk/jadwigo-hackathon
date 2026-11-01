/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Help_Try_FirstInputs */



/**
* | output |
* | --- |
* | "Have a go first. Then I can show you more." |
*
* @param {Help_Try_FirstInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const help_try_first = /** @type {((inputs?: Help_Try_FirstInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Help_Try_FirstInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Have a go first. Then I can show you more.")
	return /** @type {LocalizedString} */ ("Najpierw spróbuj. Potem pokażę ci więcej.")
});