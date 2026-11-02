/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Send_Photo_RefusedInputs */



/**
* | output |
* | --- |
* | "Remove the photo that cannot be sent" |
*
* @param {Parent_Send_Photo_RefusedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_send_photo_refused = /** @type {((inputs?: Parent_Send_Photo_RefusedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Send_Photo_RefusedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Remove the photo that cannot be sent")
	return /** @type {LocalizedString} */ ("Usuń zdjęcie, którego nie da się wysłać")
});