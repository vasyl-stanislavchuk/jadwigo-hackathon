/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_OfflineInputs */



/**
* | output |
* | --- |
* | "There's no connection. Your message stays here: send it once you're back online." |
*
* @param {Chat_OfflineInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_offline = /** @type {((inputs?: Chat_OfflineInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_OfflineInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("There's no connection. Your message stays here: send it once you're back online.")
	return /** @type {LocalizedString} */ ("Nie ma połączenia z siecią. Wiadomość zostaje tutaj: wyślij ją, gdy sieć wróci.")
});