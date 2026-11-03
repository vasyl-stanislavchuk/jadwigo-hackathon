/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Stage_Again_3Inputs */



/**
* | output |
* | --- |
* | "third time" |
*
* @param {Chat_Stage_Again_3Inputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_stage_again_3 = /** @type {((inputs?: Chat_Stage_Again_3Inputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Stage_Again_3Inputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("third time")
	return /** @type {LocalizedString} */ ("trzeci raz")
});