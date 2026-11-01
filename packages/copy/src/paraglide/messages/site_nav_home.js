/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Site_Nav_HomeInputs */



/**
* | output |
* | --- |
* | "Jadwigo, home page" |
*
* @param {Site_Nav_HomeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const site_nav_home = /** @type {((inputs?: Site_Nav_HomeInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Site_Nav_HomeInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Jadwigo, home page")
	return /** @type {LocalizedString} */ ("Jadwigo, strona główna")
});