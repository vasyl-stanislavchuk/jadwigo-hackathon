/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Credit_Not_Affiliated_AlfikInputs */



/**
* | output |
* | --- |
* | "Jadwigo is not affiliated with Alfik Matematyczny." |
*
* @param {Credit_Not_Affiliated_AlfikInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_not_affiliated_alfik = /** @type {((inputs?: Credit_Not_Affiliated_AlfikInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Credit_Not_Affiliated_AlfikInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Jadwigo is not affiliated with Alfik Matematyczny.")
	return /** @type {LocalizedString} */ ("Jadwigo nie jest związane z Alfikiem Matematycznym")
});