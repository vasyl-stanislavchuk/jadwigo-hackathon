/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Send_UploadingInputs */



/**
* | output |
* | --- |
* | "Waiting for the photos to upload" |
*
* @param {Parent_Send_UploadingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_send_uploading = /** @type {((inputs?: Parent_Send_UploadingInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Send_UploadingInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Waiting for the photos to upload")
	return /** @type {LocalizedString} */ ("Czekam, aż zdjęcia się wyślą")
});