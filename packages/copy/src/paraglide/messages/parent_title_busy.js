/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Title_BusyInputs */



/**
* | output |
* | --- |
* | "Jadwigo is changing the lesson. Try again in a moment." |
*
* @param {Parent_Title_BusyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_title_busy = /** @type {((inputs?: Parent_Title_BusyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Title_BusyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Jadwigo is changing the lesson. Try again in a moment.")
	return /** @type {LocalizedString} */ ("Jadwigo właśnie zmienia lekcję. Spróbuj za chwilę.")
});