/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ mb: NonNullable<unknown> }} Attach_Document_Too_LargeInputs */



/**
* | output |
* | --- |
* | "This file is over {mb} MB. Save a smaller copy or add a photo of the page" |
*
* @param {Attach_Document_Too_LargeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_document_too_large = /** @type {((inputs: Attach_Document_Too_LargeInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Attach_Document_Too_LargeInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`This file is over ${i?.mb} MB. Save a smaller copy or add a photo of the page`)
	return /** @type {LocalizedString} */ (`Ten plik ma więcej niż ${i?.mb} MB. Zapisz go mniejszy albo dodaj zdjęcie strony`)
});