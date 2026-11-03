/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Failed_TitleInputs */



/**
* | output |
* | --- |
* | "Couldn't build the lesson." |
*
* @param {Chat_Failed_TitleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_failed_title = /** @type {((inputs?: Chat_Failed_TitleInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Failed_TitleInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Couldn't build the lesson.")
	return /** @type {LocalizedString} */ ("Nie udało się ułożyć lekcji.")
});