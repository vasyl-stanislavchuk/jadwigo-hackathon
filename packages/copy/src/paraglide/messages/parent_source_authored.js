/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Source_AuthoredInputs */



/**
* | output |
* | --- |
* | "Written by Jadwigo AI" |
*
* @param {Parent_Source_AuthoredInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_source_authored = /** @type {((inputs?: Parent_Source_AuthoredInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Source_AuthoredInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Written by Jadwigo AI")
	return /** @type {LocalizedString} */ ("Napisane przez Jadwigo AI")
});