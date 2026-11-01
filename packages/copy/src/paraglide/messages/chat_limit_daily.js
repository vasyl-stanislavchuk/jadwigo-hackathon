/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Limit_DailyInputs */



/**
* | output |
* | --- |
* | "That's all the assistant can do today. Come back tomorrow, and the lesson will be here." |
*
* @param {Chat_Limit_DailyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_limit_daily = /** @type {((inputs?: Chat_Limit_DailyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Limit_DailyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("That's all the assistant can do today. Come back tomorrow, and the lesson will be here.")
	return /** @type {LocalizedString} */ ("Na dziś to już wszystkie rozmowy z asystentem. Wróć jutro, a lekcja poczeka.")
});