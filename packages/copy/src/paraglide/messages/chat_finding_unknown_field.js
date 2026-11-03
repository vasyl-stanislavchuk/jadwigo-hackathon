/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Finding_Unknown_FieldInputs */



/**
* | output |
* | --- |
* | "This question has a part the lesson doesn't know." |
*
* @param {Chat_Finding_Unknown_FieldInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_unknown_field = /** @type {((inputs?: Chat_Finding_Unknown_FieldInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Finding_Unknown_FieldInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This question has a part the lesson doesn't know.")
	return /** @type {LocalizedString} */ ("Zadanie ma część, której lekcja nie zna.")
});