/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Phase_Waiting_MetaInputs */



/**
* | output |
* | --- |
* | "waiting for you" |
*
* @param {Chat_Phase_Waiting_MetaInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_phase_waiting_meta = /** @type {((inputs?: Chat_Phase_Waiting_MetaInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Phase_Waiting_MetaInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("waiting for you")
	return /** @type {LocalizedString} */ ("czeka na Ciebie")
});