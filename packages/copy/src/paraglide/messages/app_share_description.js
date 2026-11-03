/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} App_Share_DescriptionInputs */



/**
* | output |
* | --- |
* | "A short math or Polish lesson for grades 1–3, in the browser, with no sign-in. No points, timers or ads." |
*
* @param {App_Share_DescriptionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const app_share_description = /** @type {((inputs?: App_Share_DescriptionInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<App_Share_DescriptionInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("A short math or Polish lesson for grades 1–3, in the browser, with no sign-in. No points, timers or ads.")
	return /** @type {LocalizedString} */ ("Krótka lekcja matematyki lub polskiego dla klas 1–3, w przeglądarce, bez logowania. Bez punktów, zegarów i reklam.")
});