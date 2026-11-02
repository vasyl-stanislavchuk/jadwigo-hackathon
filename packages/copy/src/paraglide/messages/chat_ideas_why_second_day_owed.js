/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Ideas_Why_Second_Day_OwedInputs */



/**
* | output |
* | --- |
* | "A second day of practice" |
*
* @param {Chat_Ideas_Why_Second_Day_OwedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_ideas_why_second_day_owed = /** @type {((inputs?: Chat_Ideas_Why_Second_Day_OwedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Ideas_Why_Second_Day_OwedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("A second day of practice")
	return /** @type {LocalizedString} */ ("Drugi dzień ćwiczeń")
});