/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Budget_SteerInputs */



/**
* | output |
* | --- |
* | "I'm finishing the lesson with what I have, to stay within the limit." |
*
* @param {Chat_Budget_SteerInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_budget_steer = /** @type {((inputs?: Chat_Budget_SteerInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Budget_SteerInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("I'm finishing the lesson with what I have, to stay within the limit.")
	return /** @type {LocalizedString} */ ("Kończę lekcję z tym, co mam, żeby zmieścić się w limicie.")
});