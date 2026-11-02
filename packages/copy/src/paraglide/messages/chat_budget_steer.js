/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Budget_SteerInputs */



/**
* | output |
* | --- |
* | "Finishing the lesson with what there is, to stay within the limit." |
*
* @param {Chat_Budget_SteerInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_budget_steer = /** @type {((inputs?: Chat_Budget_SteerInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Budget_SteerInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Finishing the lesson with what there is, to stay within the limit.")
	return /** @type {LocalizedString} */ ("Kończenie lekcji z tym, co jest, żeby zmieścić się w limicie.")
});