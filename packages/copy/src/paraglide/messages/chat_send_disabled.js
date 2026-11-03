/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Send_DisabledInputs */



/**
* | output |
* | --- |
* | "Type something or add a photo." |
*
* @param {Chat_Send_DisabledInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_send_disabled = /** @type {((inputs?: Chat_Send_DisabledInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Send_DisabledInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Type something or add a photo.")
	return /** @type {LocalizedString} */ ("Napisz coś albo dodaj zdjęcie.")
});