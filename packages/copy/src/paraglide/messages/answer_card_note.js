/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Answer_Card_NoteInputs */



/**
* | output |
* | --- |
* | "Fill in the whole circle next to one letter, with a black pen." |
*
* @param {Answer_Card_NoteInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const answer_card_note = /** @type {((inputs?: Answer_Card_NoteInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Answer_Card_NoteInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Fill in the whole circle next to one letter, with a black pen.")
	return /** @type {LocalizedString} */ ("Zamaluj całe kółko przy jednej literze, czarnym długopisem.")
});