/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ b: NonNullable<unknown>, a: NonNullable<unknown> }} Number_Line_LabelInputs */



/**
* | jumps_noun | output |
* | --- | --- |
* | "one" | "{b} jump of {a}" |
* | "other" | "{b} jumps of {a}" |
*
* @param {Number_Line_LabelInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const number_line_label = /** @type {((inputs: Number_Line_LabelInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Number_Line_LabelInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const jumps_noun = registry.plural("en", i?.b, {}, true);
		if (jumps_noun === "one") return /** @type {LocalizedString} */ (`${i?.b} jump of ${i?.a}`);
		if (jumps_noun === "other") return /** @type {LocalizedString} */ (`${i?.b} jumps of ${i?.a}`);
		return /** @type {LocalizedString} */ ("number_line_label");
	}
	{
		const jumps_noun = registry.plural("pl", i?.b, {}, true);
		if (jumps_noun === "one") return /** @type {LocalizedString} */ (`${i?.b} skok po ${i?.a}`);
		if (jumps_noun === "few") return /** @type {LocalizedString} */ (`${i?.b} skoki po ${i?.a}`);
		if (jumps_noun === "many") return /** @type {LocalizedString} */ (`${i?.b} skoków po ${i?.a}`);
		if (jumps_noun === "other") return /** @type {LocalizedString} */ (`${i?.b} skoków po ${i?.a}`);
		return /** @type {LocalizedString} */ ("number_line_label");
	}
});