/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Analytics_AskInputs */



/**
* | output |
* | --- |
* | "Jadwigo records how the app is used, including screen recordings without what you type, so we can make it better. Do you agree?" |
*
* @param {Parent_Analytics_AskInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_analytics_ask = /** @type {((inputs?: Parent_Analytics_AskInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Analytics_AskInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Jadwigo records how the app is used, including screen recordings without what you type, so we can make it better. Do you agree?")
	return /** @type {LocalizedString} */ ("Jadwigo zapisuje, jak używasz aplikacji, także nagrania ekranu bez tego, co wpisujesz. Dzięki temu ją ulepszamy. Zgadzasz się?")
});