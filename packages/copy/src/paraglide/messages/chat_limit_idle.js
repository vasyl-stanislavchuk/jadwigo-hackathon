/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Limit_IdleInputs */



/**
* | output |
* | --- |
* | "The conversation waited a long time, so the turn ended. Write to carry on." |
*
* @param {Chat_Limit_IdleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_limit_idle = /** @type {((inputs?: Chat_Limit_IdleInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Limit_IdleInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The conversation waited a long time, so the turn ended. Write to carry on.")
	return /** @type {LocalizedString} */ ("Rozmowa długo czekała, więc tura się zakończyła. Napisz, aby iść dalej.")
});