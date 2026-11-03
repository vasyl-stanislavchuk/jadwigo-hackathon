/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Problem_FailedInputs */



/**
* | output |
* | --- |
* | "Jadwigo could not finish this request, even after a few tries." |
*
* @param {Chat_Problem_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_problem_failed = /** @type {((inputs?: Chat_Problem_FailedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Problem_FailedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Jadwigo could not finish this request, even after a few tries.")
	return /** @type {LocalizedString} */ ("Jadwigo nie dała rady dokończyć tej prośby, mimo kilku prób.")
});