/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Status_Awaiting_InputInputs */



/**
* | output |
* | --- |
* | "Waiting for you" |
*
* @param {Chat_Status_Awaiting_InputInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_status_awaiting_input = /** @type {((inputs?: Chat_Status_Awaiting_InputInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Status_Awaiting_InputInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Waiting for you")
	return /** @type {LocalizedString} */ ("Czekam na Ciebie")
});