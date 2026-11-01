/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Revision_By_AiInputs */



/**
* | output |
* | --- |
* | "Changed by the assistant" |
*
* @param {Chat_Revision_By_AiInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_revision_by_ai = /** @type {((inputs?: Chat_Revision_By_AiInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Revision_By_AiInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Changed by the assistant")
	return /** @type {LocalizedString} */ ("Zmienione przez asystenta")
});