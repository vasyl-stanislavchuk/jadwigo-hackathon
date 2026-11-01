/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Overview_LinkInputs */



/**
* | output |
* | --- |
* | "Every attempt at this lesson" |
*
* @param {Parent_Overview_LinkInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_overview_link = /** @type {((inputs?: Parent_Overview_LinkInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Overview_LinkInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Every attempt at this lesson")
	return /** @type {LocalizedString} */ ("Wszystkie podejścia do tej lekcji")
});