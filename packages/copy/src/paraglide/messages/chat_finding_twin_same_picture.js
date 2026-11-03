/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Finding_Twin_Same_PictureInputs */



/**
* | output |
* | --- |
* | "The picture in the similar question shows this question's numbers." |
*
* @param {Chat_Finding_Twin_Same_PictureInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_twin_same_picture = /** @type {((inputs?: Chat_Finding_Twin_Same_PictureInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Finding_Twin_Same_PictureInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The picture in the similar question shows this question's numbers.")
	return /** @type {LocalizedString} */ ("Obrazek w podobnym pytaniu pokazuje liczby z tego zadania.")
});