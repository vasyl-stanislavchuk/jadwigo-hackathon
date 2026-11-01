/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Ds_Wait_ExplainInputs */



/**
* | output |
* | --- |
* | "Write or say your explanation." |
*
* @param {Ds_Wait_ExplainInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_wait_explain = /** @type {((inputs?: Ds_Wait_ExplainInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Ds_Wait_ExplainInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Write or say your explanation.")
	return /** @type {LocalizedString} */ ("Napisz albo powiedz swoje wyjaśnienie.")
});