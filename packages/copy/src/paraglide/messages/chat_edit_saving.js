/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Edit_SavingInputs */



/**
* | output |
* | --- |
* | "Saving your change to the lesson…" |
*
* @param {Chat_Edit_SavingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_edit_saving = /** @type {((inputs?: Chat_Edit_SavingInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Edit_SavingInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Saving your change to the lesson…")
	return /** @type {LocalizedString} */ ("Zapisuję Twoją zmianę w lekcji…")
});