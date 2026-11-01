/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_QueuedInputs */



/**
* | output |
* | --- |
* | "Your message will be sent when the assistant finishes its reply." |
*
* @param {Chat_QueuedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_queued = /** @type {((inputs?: Chat_QueuedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_QueuedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Your message will be sent when the assistant finishes its reply.")
	return /** @type {LocalizedString} */ ("Wyślę po tej turze")
});