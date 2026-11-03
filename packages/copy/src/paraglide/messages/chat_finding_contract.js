/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Finding_ContractInputs */



/**
* | output |
* | --- |
* | "Part of this question has a shape the lesson can't take." |
*
* @param {Chat_Finding_ContractInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_contract = /** @type {((inputs?: Chat_Finding_ContractInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Finding_ContractInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Part of this question has a shape the lesson can't take.")
	return /** @type {LocalizedString} */ ("Część zadania ma kształt, którego lekcja nie przyjmie.")
});