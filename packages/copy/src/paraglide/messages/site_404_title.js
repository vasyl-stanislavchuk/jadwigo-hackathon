/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Site_404_TitleInputs */



/**
* | output |
* | --- |
* | "Page not found · Jadwigo" |
*
* @param {Site_404_TitleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const site_404_title = /** @type {((inputs?: Site_404_TitleInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Site_404_TitleInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Page not found · Jadwigo")
	return /** @type {LocalizedString} */ ("Nie ma takiej strony · Jadwigo")
});