/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Tool_Learner_WeekInputs */



/**
* | output |
* | --- |
* | "Reading the child's week" |
*
* @param {Chat_Tool_Learner_WeekInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_learner_week = /** @type {((inputs?: Chat_Tool_Learner_WeekInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Tool_Learner_WeekInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Reading the child's week")
	return /** @type {LocalizedString} */ ("Czytanie tygodnia dziecka")
});