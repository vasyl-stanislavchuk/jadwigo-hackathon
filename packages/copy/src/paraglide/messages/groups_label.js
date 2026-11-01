/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ a: NonNullable<unknown>, b: NonNullable<unknown> }} Groups_LabelInputs */



/**
* | groups_noun | output |
* | --- | --- |
* | "one" | "{a} group of {b}" |
* | "other" | "{a} groups of {b}" |
*
* @param {Groups_LabelInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const groups_label = /** @type {((inputs: Groups_LabelInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Groups_LabelInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const groups_noun = registry.plural("en", i?.a, {}, true);
		if (groups_noun === "one") return /** @type {LocalizedString} */ (`${i?.a} group of ${i?.b}`);
		if (groups_noun === "other") return /** @type {LocalizedString} */ (`${i?.a} groups of ${i?.b}`);
		return /** @type {LocalizedString} */ ("groups_label");
	}
	{
		const groups_noun = registry.plural("pl", i?.a, {}, true);
		if (groups_noun === "one") return /** @type {LocalizedString} */ (`${i?.a} grupa po ${i?.b}`);
		if (groups_noun === "few") return /** @type {LocalizedString} */ (`${i?.a} grupy po ${i?.b}`);
		if (groups_noun === "many") return /** @type {LocalizedString} */ (`${i?.a} grup po ${i?.b}`);
		if (groups_noun === "other") return /** @type {LocalizedString} */ (`${i?.a} grup po ${i?.b}`);
		return /** @type {LocalizedString} */ ("groups_label");
	}
});