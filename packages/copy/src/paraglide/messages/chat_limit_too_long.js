/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Limit_Too_LongInputs */



/**
* | output |
* | --- |
* | "This turn ran too long, so it stopped. The lesson so far is saved: say what to do next." |
*
* @param {Chat_Limit_Too_LongInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_limit_too_long = /** @type {((inputs?: Chat_Limit_Too_LongInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Limit_Too_LongInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This turn ran too long, so it stopped. The lesson so far is saved: say what to do next.")
	return /** @type {LocalizedString} */ ("Ta tura trwała zbyt długo, więc się zatrzymała. Lekcja do tej pory jest zapisana: napisz, co dalej.")
});