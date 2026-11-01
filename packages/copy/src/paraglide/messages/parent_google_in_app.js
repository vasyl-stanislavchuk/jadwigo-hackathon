/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Google_In_AppInputs */



/**
* | output |
* | --- |
* | "Google can't sign you in inside this app. To continue with Google, open this page in your phone's browser." |
*
* @param {Parent_Google_In_AppInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_google_in_app = /** @type {((inputs?: Parent_Google_In_AppInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Google_In_AppInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Google can't sign you in inside this app. To continue with Google, open this page in your phone's browser.")
	return /** @type {LocalizedString} */ ("W tej aplikacji Google nie pozwala się zalogować. Aby kontynuować z Google, otwórz tę stronę w przeglądarce telefonu.")
});