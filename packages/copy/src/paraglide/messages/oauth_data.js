/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ app: NonNullable<unknown> }} Oauth_DataInputs */



/**
* | output |
* | --- |
* | "Your children's data, names included, will go to {app}." |
*
* @param {Oauth_DataInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const oauth_data = /** @type {((inputs: Oauth_DataInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Oauth_DataInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Your children's data, names included, will go to ${i?.app}.`)
	return /** @type {LocalizedString} */ (`Dane Twoich dzieci, także ich imiona, trafią do ${i?.app}.`)
});