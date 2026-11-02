/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Ideas_List_RecheckInputs */



/**
* | output |
* | --- |
* | "Check again" |
*
* @param {Chat_Ideas_List_RecheckInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_ideas_list_recheck = /** @type {((inputs?: Chat_Ideas_List_RecheckInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Ideas_List_RecheckInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Check again")
	return /** @type {LocalizedString} */ ("Do sprawdzenia jeszcze raz")
});