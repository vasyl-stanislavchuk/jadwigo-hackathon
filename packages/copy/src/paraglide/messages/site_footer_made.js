/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Site_Footer_MadeInputs */



/**
* | output |
* | --- |
* | "Jadwigo was built at the Meta hackathon." |
*
* @param {Site_Footer_MadeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const site_footer_made = /** @type {((inputs?: Site_Footer_MadeInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Site_Footer_MadeInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Jadwigo was built at the Meta hackathon.")
	return /** @type {LocalizedString} */ ("Jadwigo powstało podczas hackathonu Meta.")
});