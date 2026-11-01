/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Ruler_LabelInputs */



/**
* | output |
* | --- |
* | "Ruler. Drag it, or move it with the arrow keys." |
*
* @param {Ruler_LabelInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ruler_label = /** @type {((inputs?: Ruler_LabelInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Ruler_LabelInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Ruler. Drag it, or move it with the arrow keys.")
	return /** @type {LocalizedString} */ ("Linijka. Przeciągnij ją albo przesuń strzałkami.")
});