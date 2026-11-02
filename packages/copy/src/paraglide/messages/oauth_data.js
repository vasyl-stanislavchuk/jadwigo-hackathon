/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ app: NonNullable<unknown> }} Oauth_DataInputs */



/**
* | output |
* | --- |
* | "{app} will get your children's names, lessons and results." |
*
* @param {Oauth_DataInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const oauth_data = /** @type {((inputs: Oauth_DataInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Oauth_DataInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.app} will get your children's names, lessons and results.`)
	return /** @type {LocalizedString} */ (`${i?.app} dostanie imiona Twoich dzieci, ich lekcje i wyniki.`)
});