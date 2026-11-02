/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Credit_From_AlfikInputs */



/**
* | output |
* | --- |
* | "from Alfik Matematyczny" |
*
* @param {Credit_From_AlfikInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_from_alfik = /** @type {((inputs?: Credit_From_AlfikInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Credit_From_AlfikInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("from Alfik Matematyczny")
	return /** @type {LocalizedString} */ ("z Alfika Matematycznego")
});