/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Announce_StoppedInputs */



/**
* | output |
* | --- |
* | "Saved, stopped." |
*
* @param {Chat_Announce_StoppedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_announce_stopped = /** @type {((inputs?: Chat_Announce_StoppedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Announce_StoppedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Saved, stopped.")
	return /** @type {LocalizedString} */ ("Zapisane, zatrzymane.")
});