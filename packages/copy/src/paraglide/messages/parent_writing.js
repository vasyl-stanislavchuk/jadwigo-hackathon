/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_WritingInputs */



/**
* | output |
* | --- |
* | "Jadwigo is writing the lesson" |
*
* @param {Parent_WritingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_writing = /** @type {((inputs?: Parent_WritingInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_WritingInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Jadwigo is writing the lesson")
	return /** @type {LocalizedString} */ ("Jadwigo pisze lekcję")
});