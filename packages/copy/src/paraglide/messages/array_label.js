/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ a: NonNullable<unknown>, b: NonNullable<unknown> }} Array_LabelInputs */



/**
* | rows_noun | dots_noun | output |
* | --- | --- | --- |
* | "one" | "one" | "{a} row of {b} dot" |
* | "one" | "other" | "{a} row of {b} dots" |
* | "other" | "one" | "{a} rows of {b} dot" |
* | "other" | "other" | "{a} rows of {b} dots" |
*
* @param {Array_LabelInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const array_label = /** @type {((inputs: Array_LabelInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Array_LabelInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const rows_noun = registry.plural("en", i?.a, {}, true);
		const dots_noun = registry.plural("en", i?.b, {}, true);
		if (rows_noun === "one" && dots_noun === "one") return /** @type {LocalizedString} */ (`${i?.a} row of ${i?.b} dot`);
		if (rows_noun === "one" && dots_noun === "other") return /** @type {LocalizedString} */ (`${i?.a} row of ${i?.b} dots`);
		if (rows_noun === "other" && dots_noun === "one") return /** @type {LocalizedString} */ (`${i?.a} rows of ${i?.b} dot`);
		if (rows_noun === "other" && dots_noun === "other") return /** @type {LocalizedString} */ (`${i?.a} rows of ${i?.b} dots`);
		return /** @type {LocalizedString} */ ("array_label");
	}
	{
		const rows_noun = registry.plural("pl", i?.a, {}, true);
		const dots_noun = registry.plural("pl", i?.b, {}, true);
		if (rows_noun === "one" && dots_noun === "one") return /** @type {LocalizedString} */ (`${i?.a} rząd po ${i?.b} kropce`);
		if (rows_noun === "one" && dots_noun === "few") return /** @type {LocalizedString} */ (`${i?.a} rząd po ${i?.b} kropki`);
		if (rows_noun === "one" && dots_noun === "many") return /** @type {LocalizedString} */ (`${i?.a} rząd po ${i?.b} kropek`);
		if (rows_noun === "one" && dots_noun === "other") return /** @type {LocalizedString} */ (`${i?.a} rząd po ${i?.b} kropek`);
		if (rows_noun === "few" && dots_noun === "one") return /** @type {LocalizedString} */ (`${i?.a} rzędy po ${i?.b} kropce`);
		if (rows_noun === "few" && dots_noun === "few") return /** @type {LocalizedString} */ (`${i?.a} rzędy po ${i?.b} kropki`);
		if (rows_noun === "few" && dots_noun === "many") return /** @type {LocalizedString} */ (`${i?.a} rzędy po ${i?.b} kropek`);
		if (rows_noun === "few" && dots_noun === "other") return /** @type {LocalizedString} */ (`${i?.a} rzędy po ${i?.b} kropek`);
		if (rows_noun === "many" && dots_noun === "one") return /** @type {LocalizedString} */ (`${i?.a} rzędów po ${i?.b} kropce`);
		if (rows_noun === "many" && dots_noun === "few") return /** @type {LocalizedString} */ (`${i?.a} rzędów po ${i?.b} kropki`);
		if (rows_noun === "many" && dots_noun === "many") return /** @type {LocalizedString} */ (`${i?.a} rzędów po ${i?.b} kropek`);
		if (rows_noun === "many" && dots_noun === "other") return /** @type {LocalizedString} */ (`${i?.a} rzędów po ${i?.b} kropek`);
		if (rows_noun === "other" && dots_noun === "one") return /** @type {LocalizedString} */ (`${i?.a} rzędów po ${i?.b} kropce`);
		if (rows_noun === "other" && dots_noun === "few") return /** @type {LocalizedString} */ (`${i?.a} rzędów po ${i?.b} kropki`);
		if (rows_noun === "other" && dots_noun === "many") return /** @type {LocalizedString} */ (`${i?.a} rzędów po ${i?.b} kropek`);
		if (rows_noun === "other" && dots_noun === "other") return /** @type {LocalizedString} */ (`${i?.a} rzędów po ${i?.b} kropek`);
		return /** @type {LocalizedString} */ ("array_label");
	}
});