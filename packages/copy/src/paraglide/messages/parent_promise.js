/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_PromiseInputs */



/**
* | output |
* | --- |
* | "We keep your child's lessons on your account, so the next ones fit them." |
*
* @param {Parent_PromiseInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_promise = /** @type {((inputs?: Parent_PromiseInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_PromiseInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("We keep your child's lessons on your account, so the next ones fit them.")
	return /** @type {LocalizedString} */ ("Zapiszemy lekcje dziecka na Twoim koncie, żeby następne do niego pasowały.")
});