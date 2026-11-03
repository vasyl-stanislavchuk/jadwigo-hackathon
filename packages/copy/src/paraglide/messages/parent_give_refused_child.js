/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Give_Refused_ChildInputs */



/**
* | output |
* | --- |
* | "This child isn't in your family. Pick another in “For”." |
*
* @param {Parent_Give_Refused_ChildInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_give_refused_child = /** @type {((inputs?: Parent_Give_Refused_ChildInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Give_Refused_ChildInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This child isn't in your family. Pick another in “For”.")
	return /** @type {LocalizedString} */ ("Tego dziecka nie ma w Twojej rodzinie. Wybierz inne w „Dla”.")
});