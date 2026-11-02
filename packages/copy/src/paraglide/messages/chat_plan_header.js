/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown>, m: NonNullable<unknown> }} Chat_Plan_HeaderInputs */



/**
* | output |
* | --- |
* | "Plan · {n} of {m}" |
*
* @param {Chat_Plan_HeaderInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_plan_header = /** @type {((inputs: Chat_Plan_HeaderInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Plan_HeaderInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Plan · ${i?.n} of ${i?.m}`)
	return /** @type {LocalizedString} */ (`Plan · ${i?.n} z ${i?.m}`)
});