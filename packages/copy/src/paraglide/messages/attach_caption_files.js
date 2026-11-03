/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Attach_Caption_FilesInputs */



/**
* | output |
* | --- |
* | "This is how Jadwigo sees the files" |
*
* @param {Attach_Caption_FilesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_caption_files = /** @type {((inputs?: Attach_Caption_FilesInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Attach_Caption_FilesInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This is how Jadwigo sees the files")
	return /** @type {LocalizedString} */ ("Tak Jadwigo widzi pliki")
});