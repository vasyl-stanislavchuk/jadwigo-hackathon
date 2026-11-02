/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Site_Consent_AskInputs */



/**
* | output |
* | --- |
* | "Jadwigo records how the site is used, including screen recordings without what you type, so we can make it better. Do you agree?" |
*
* @param {Site_Consent_AskInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const site_consent_ask = /** @type {((inputs?: Site_Consent_AskInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Site_Consent_AskInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Jadwigo records how the site is used, including screen recordings without what you type, so we can make it better. Do you agree?")
	return /** @type {LocalizedString} */ ("Jadwigo zapisuje, jak odwiedzasz stronę, także nagrania ekranu bez tego, co wpisujesz. Dzięki temu ją ulepszamy. Zgadzasz się?")
});