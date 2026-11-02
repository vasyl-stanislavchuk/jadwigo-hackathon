/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown>, m: NonNullable<unknown> }} Chat_Plan_ProgressInputs */



/**
* | output |
* | --- |
* | "{n} of {m}" |
*
* @param {Chat_Plan_ProgressInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_plan_progress = /** @type {((inputs: Chat_Plan_ProgressInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Plan_ProgressInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.n} of ${i?.m}`)
	return /** @type {LocalizedString} */ (`${i?.n} z ${i?.m}`)
});