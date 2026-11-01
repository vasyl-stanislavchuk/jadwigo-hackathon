/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Name_NoteInputs */



/**
* | output |
* | --- |
* | "Only you and Jadwigo in the chat see it. It never goes into a lesson." |
*
* @param {Parent_Name_NoteInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_name_note = /** @type {((inputs?: Parent_Name_NoteInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Name_NoteInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Only you and Jadwigo in the chat see it. It never goes into a lesson.")
	return /** @type {LocalizedString} */ ("Widzisz je tylko Ty i Jadwigo w rozmowie. Nie trafia do lekcji.")
});