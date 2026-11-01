/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Ds_Progress_HalfInputs */



/**
* | output |
* | --- |
* | "Lesson: about halfway" |
*
* @param {Ds_Progress_HalfInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_progress_half = /** @type {((inputs?: Ds_Progress_HalfInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Ds_Progress_HalfInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Lesson: about halfway")
	return /** @type {LocalizedString} */ ("Lekcja: mniej więcej połowa")
});