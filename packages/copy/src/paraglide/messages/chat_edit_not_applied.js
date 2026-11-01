/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Edit_Not_AppliedInputs */



/**
* | output |
* | --- |
* | "This change wasn't applied: the lesson changed in the meantime, or the change doesn't fit it. Your text is below." |
*
* @param {Chat_Edit_Not_AppliedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_edit_not_applied = /** @type {((inputs?: Chat_Edit_Not_AppliedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Edit_Not_AppliedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This change wasn't applied: the lesson changed in the meantime, or the change doesn't fit it. Your text is below.")
	return /** @type {LocalizedString} */ ("Tej zmiany nie udało się wprowadzić: lekcja zmieniła się w międzyczasie albo zmiana jej nie pasuje. Twój tekst jest poniżej.")
});