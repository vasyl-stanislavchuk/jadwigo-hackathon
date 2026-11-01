/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Remove_PhotoInputs */



/**
* | output |
* | --- |
* | "Remove the photo" |
*
* @param {Parent_Remove_PhotoInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_remove_photo = /** @type {((inputs?: Parent_Remove_PhotoInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Remove_PhotoInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Remove the photo")
	return /** @type {LocalizedString} */ ("Usuń zdjęcie")
});