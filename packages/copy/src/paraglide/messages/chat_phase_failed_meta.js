/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ t: NonNullable<unknown> }} Chat_Phase_Failed_MetaInputs */



/**
* | output |
* | --- |
* | "stopped early · {t}" |
*
* @param {Chat_Phase_Failed_MetaInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_phase_failed_meta = /** @type {((inputs: Chat_Phase_Failed_MetaInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Phase_Failed_MetaInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`stopped early · ${i?.t}`)
	return /** @type {LocalizedString} */ (`przerwane · ${i?.t}`)
});