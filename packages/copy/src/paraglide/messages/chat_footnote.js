/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_FootnoteInputs */



/**
* | output |
* | --- |
* | "Jadwigo AI isn't always right. Nothing reaches the child before you check it." |
*
* @param {Chat_FootnoteInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_footnote = /** @type {((inputs?: Chat_FootnoteInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_FootnoteInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Jadwigo AI isn't always right. Nothing reaches the child before you check it.")
	return /** @type {LocalizedString} */ ("Jadwigo AI może się mylić. Nic nie trafi do dziecka, zanim tego nie sprawdzisz.")
});