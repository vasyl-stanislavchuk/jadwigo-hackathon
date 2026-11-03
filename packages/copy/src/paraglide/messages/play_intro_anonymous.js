/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Play_Intro_AnonymousInputs */



/**
* | output |
* | --- |
* | "Play without a name" |
*
* @param {Play_Intro_AnonymousInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_intro_anonymous = /** @type {((inputs?: Play_Intro_AnonymousInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Play_Intro_AnonymousInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Play without a name")
	return /** @type {LocalizedString} */ ("Zagraj bez imienia")
});