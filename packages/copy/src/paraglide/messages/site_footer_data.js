/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Site_Footer_DataInputs */



/**
* | output |
* | --- |
* | "Only you see your child's answers. You can ask us to delete them at any time." |
*
* @param {Site_Footer_DataInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const site_footer_data = /** @type {((inputs?: Site_Footer_DataInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Site_Footer_DataInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Only you see your child's answers. You can ask us to delete them at any time.")
	return /** @type {LocalizedString} */ ("Odpowiedzi dziecka widzisz tylko Ty. W każdej chwili możesz poprosić o ich usunięcie.")
});