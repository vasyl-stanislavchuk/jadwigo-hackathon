/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Not_FoundInputs */



/**
* | output |
* | --- |
* | "There's no such lesson here. It may belong to another account, or it was deleted." |
*
* @param {Chat_Not_FoundInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_not_found = /** @type {((inputs?: Chat_Not_FoundInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Not_FoundInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("There's no such lesson here. It may belong to another account, or it was deleted.")
	return /** @type {LocalizedString} */ ("Nie ma tu takiej lekcji. Może należy do innego konta albo została usunięta.")
});