/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Check_Level_WarningInputs */



/**
* | output |
* | --- |
* | "Worth a look" |
*
* @param {Chat_Check_Level_WarningInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_check_level_warning = /** @type {((inputs?: Chat_Check_Level_WarningInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Check_Level_WarningInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Worth a look")
	return /** @type {LocalizedString} */ ("Warto spojrzeć")
});