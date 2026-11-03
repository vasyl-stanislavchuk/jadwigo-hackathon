/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Credit_Notice_KhanInputs */



/**
* | output |
* | --- |
* | "All Khan Academy content is available for free at www.khanacademy.org" |
*
* @param {Credit_Notice_KhanInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_notice_khan = /** @type {((inputs?: Credit_Notice_KhanInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Credit_Notice_KhanInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("All Khan Academy content is available for free at www.khanacademy.org")
	return /** @type {LocalizedString} */ ("Wszystkie materiały Khan Academy są dostępne za darmo na www.khanacademy.org")
});