/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Play_Save_NoteInputs */



/**
* | output |
* | --- |
* | "For a grown-up: sign in, and this lesson stays on your child's account." |
*
* @param {Play_Save_NoteInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_save_note = /** @type {((inputs?: Play_Save_NoteInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Play_Save_NoteInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("For a grown-up: sign in, and this lesson stays on your child's account.")
	return /** @type {LocalizedString} */ ("Dla dorosłego: zaloguj się, a ta lekcja zostanie na koncie dziecka.")
});