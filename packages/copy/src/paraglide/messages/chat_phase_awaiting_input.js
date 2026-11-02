/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Phase_Awaiting_InputInputs */



/**
* | output |
* | --- |
* | "Waiting for you" |
*
* @param {Chat_Phase_Awaiting_InputInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_phase_awaiting_input = /** @type {((inputs?: Chat_Phase_Awaiting_InputInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Phase_Awaiting_InputInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Waiting for you")
	return /** @type {LocalizedString} */ ("Czeka na Ciebie")
});