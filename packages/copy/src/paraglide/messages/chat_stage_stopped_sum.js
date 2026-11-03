/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Stage_Stopped_SumInputs */



/**
* | output |
* | --- |
* | "stopped" |
*
* @param {Chat_Stage_Stopped_SumInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_stage_stopped_sum = /** @type {((inputs?: Chat_Stage_Stopped_SumInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Stage_Stopped_SumInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("stopped")
	return /** @type {LocalizedString} */ ("zatrzymane")
});