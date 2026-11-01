/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Budget_SteerInputs */



/**
* | output |
* | --- |
* | "Half the budget is used, so I'm finishing the lesson with what I have." |
*
* @param {Chat_Budget_SteerInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_budget_steer = /** @type {((inputs?: Chat_Budget_SteerInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Budget_SteerInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Half the budget is used, so I'm finishing the lesson with what I have.")
	return /** @type {LocalizedString} */ ("Połowa budżetu wykorzystana: kończę lekcję z tym, co mam.")
});