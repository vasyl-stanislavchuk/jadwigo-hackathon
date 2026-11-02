/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Credit_Label_AlfikInputs */



/**
* | output |
* | --- |
* | "From Alfik Matematyczny. See the source and license." |
*
* @param {Credit_Label_AlfikInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_label_alfik = /** @type {((inputs?: Credit_Label_AlfikInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Credit_Label_AlfikInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("From Alfik Matematyczny. See the source and license.")
	return /** @type {LocalizedString} */ ("z Alfika Matematycznego, źródło i licencja")
});