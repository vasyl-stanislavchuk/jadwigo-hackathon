/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Send_FailedInputs */



/**
* | output |
* | --- |
* | "The code did not go out. Try again in a moment." |
*
* @param {Parent_Send_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_send_failed = /** @type {((inputs?: Parent_Send_FailedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Send_FailedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The code did not go out. Try again in a moment.")
	return /** @type {LocalizedString} */ ("Nie udało się wysłać kodu. Spróbuj za chwilę.")
});