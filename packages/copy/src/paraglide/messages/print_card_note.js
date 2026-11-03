/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Print_Card_NoteInputs */



/**
* | output |
* | --- |
* | "Tick ✓ each question you have done." |
*
* @param {Print_Card_NoteInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const print_card_note = /** @type {((inputs?: Print_Card_NoteInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Print_Card_NoteInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Tick ✓ each question you have done.")
	return /** @type {LocalizedString} */ ("Zaznacz ✓ każde zadanie, które masz już zrobione.")
});