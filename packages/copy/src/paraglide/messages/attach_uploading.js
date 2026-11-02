/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ percent: NonNullable<unknown> }} Attach_UploadingInputs */



/**
* | output |
* | --- |
* | "Uploading the photo, {percent}%" |
*
* @param {Attach_UploadingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_uploading = /** @type {((inputs: Attach_UploadingInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Attach_UploadingInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Uploading the photo, ${i?.percent}%`)
	return /** @type {LocalizedString} */ (`Wysyłam zdjęcie, ${i?.percent}%`)
});