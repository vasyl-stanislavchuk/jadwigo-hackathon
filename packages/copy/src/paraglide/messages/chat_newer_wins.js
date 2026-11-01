/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Newer_WinsInputs */



/**
* | output |
* | --- |
* | "Your version is newer, so it stays. The assistant knows." |
*
* @param {Chat_Newer_WinsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_newer_wins = /** @type {((inputs?: Chat_Newer_WinsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Newer_WinsInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Your version is newer, so it stays. The assistant knows.")
	return /** @type {LocalizedString} */ ("Twoja wersja jest nowsza, więc zostaje. Asystent o tym wie.")
});