/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Title_RefusedInputs */



/**
* | output |
* | --- |
* | "We can't use this title. Try other words." |
*
* @param {Parent_Title_RefusedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_title_refused = /** @type {((inputs?: Parent_Title_RefusedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Title_RefusedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("We can't use this title. Try other words.")
	return /** @type {LocalizedString} */ ("Tego tytułu nie możemy użyć. Spróbuj innych słów.")
});