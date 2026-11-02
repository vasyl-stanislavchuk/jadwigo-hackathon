/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Send_Photo_FailedInputs */



/**
* | output |
* | --- |
* | "Retry or remove the photo that did not upload" |
*
* @param {Parent_Send_Photo_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_send_photo_failed = /** @type {((inputs?: Parent_Send_Photo_FailedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Send_Photo_FailedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Retry or remove the photo that did not upload")
	return /** @type {LocalizedString} */ ("Ponów albo usuń zdjęcie, które się nie wysłało")
});