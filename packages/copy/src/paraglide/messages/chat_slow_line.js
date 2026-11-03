/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Slow_LineInputs */



/**
* | output |
* | --- |
* | "This is taking longer than usual. Still working." |
*
* @param {Chat_Slow_LineInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_slow_line = /** @type {((inputs?: Chat_Slow_LineInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Slow_LineInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This is taking longer than usual. Still working.")
	return /** @type {LocalizedString} */ ("To trwa dłużej niż zwykle. Pracuję dalej.")
});