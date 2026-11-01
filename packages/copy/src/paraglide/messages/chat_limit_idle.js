/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Limit_IdleInputs */



/**
* | output |
* | --- |
* | "The wait for the next step ran too long, so the turn ended. The lesson so far is saved: say what to do next." |
*
* @param {Chat_Limit_IdleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_limit_idle = /** @type {((inputs?: Chat_Limit_IdleInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Limit_IdleInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The wait for the next step ran too long, so the turn ended. The lesson so far is saved: say what to do next.")
	return /** @type {LocalizedString} */ ("Na następny krok trzeba było czekać zbyt długo, więc tura się zakończyła. Lekcja do tej pory jest zapisana: napisz, co dalej.")
});