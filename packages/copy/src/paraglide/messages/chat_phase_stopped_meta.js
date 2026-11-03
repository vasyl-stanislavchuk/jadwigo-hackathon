/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ t: NonNullable<unknown> }} Chat_Phase_Stopped_MetaInputs */



/**
* | output |
* | --- |
* | "stopped · {t}" |
*
* @param {Chat_Phase_Stopped_MetaInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_phase_stopped_meta = /** @type {((inputs: Chat_Phase_Stopped_MetaInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Phase_Stopped_MetaInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`stopped · ${i?.t}`)
	return /** @type {LocalizedString} */ (`zatrzymane · ${i?.t}`)
});