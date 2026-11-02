/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Credit_Title_AlfikInputs */



/**
* | output |
* | --- |
* | "Task from Alfik Matematyczny" |
*
* @param {Credit_Title_AlfikInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_title_alfik = /** @type {((inputs?: Credit_Title_AlfikInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Credit_Title_AlfikInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Task from Alfik Matematyczny")
	return /** @type {LocalizedString} */ ("Zadanie z Alfika Matematycznego")
});