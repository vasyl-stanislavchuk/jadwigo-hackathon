/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Tool_Lines_StuckInputs */



/**
* | output |
* | --- |
* | "Steps that got stuck" |
*
* @param {Chat_Tool_Lines_StuckInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_lines_stuck = /** @type {((inputs?: Chat_Tool_Lines_StuckInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Tool_Lines_StuckInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Steps that got stuck")
	return /** @type {LocalizedString} */ ("Kroki, które się zacięły")
});