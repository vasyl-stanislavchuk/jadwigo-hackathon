/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_EmptyInputs */



/**
* | output |
* | --- |
* | "Say what lesson you need, and it appears on the right." |
*
* @param {Chat_EmptyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_empty = /** @type {((inputs?: Chat_EmptyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_EmptyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Say what lesson you need, and it appears on the right.")
	return /** @type {LocalizedString} */ ("Napisz, jakiej lekcji potrzebujesz, a pojawi się po prawej.")
});