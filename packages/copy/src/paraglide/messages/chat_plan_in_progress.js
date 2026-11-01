/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Plan_In_ProgressInputs */



/**
* | output |
* | --- |
* | "in progress" |
*
* @param {Chat_Plan_In_ProgressInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_plan_in_progress = /** @type {((inputs?: Chat_Plan_In_ProgressInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Plan_In_ProgressInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("in progress")
	return /** @type {LocalizedString} */ ("w toku")
});