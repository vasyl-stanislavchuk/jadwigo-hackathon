/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_No_AttemptsInputs */



/**
* | output |
* | --- |
* | "No lessons here yet." |
*
* @param {Parent_No_AttemptsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_no_attempts = /** @type {((inputs?: Parent_No_AttemptsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_No_AttemptsInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("No lessons here yet.")
	return /** @type {LocalizedString} */ ("Jeszcze nie ma tu lekcji.")
});