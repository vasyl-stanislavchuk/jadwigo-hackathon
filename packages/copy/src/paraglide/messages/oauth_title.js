/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ app: NonNullable<unknown> }} Oauth_TitleInputs */



/**
* | output |
* | --- |
* | "Connect {app} to Jadwigo" |
*
* @param {Oauth_TitleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const oauth_title = /** @type {((inputs: Oauth_TitleInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Oauth_TitleInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Connect ${i?.app} to Jadwigo`)
	return /** @type {LocalizedString} */ (`Połącz ${i?.app} z Jadwigo`)
});