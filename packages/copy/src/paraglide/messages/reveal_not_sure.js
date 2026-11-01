/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Reveal_Not_SureInputs */



/**
* | output |
* | --- |
* | "Not sure yet" |
*
* @param {Reveal_Not_SureInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const reveal_not_sure = /** @type {((inputs?: Reveal_Not_SureInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reveal_Not_SureInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Not sure yet")
	return /** @type {LocalizedString} */ ("Jeszcze nie wiem")
});