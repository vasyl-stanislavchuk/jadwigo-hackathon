/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Dev_OnlyInputs */



/**
* | output |
* | --- |
* | "The chat page runs on the dev server only: start it with make dev." |
*
* @param {Chat_Dev_OnlyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_dev_only = /** @type {((inputs?: Chat_Dev_OnlyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Dev_OnlyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The chat page runs on the dev server only: start it with make dev.")
	return /** @type {LocalizedString} */ ("Strona rozmowy działa tylko na serwerze deweloperskim: uruchom ją przez make dev.")
});