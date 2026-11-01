/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Twos_MiscountedInputs */



/**
* | output |
* | --- |
* | "The twos counted differently" |
*
* @param {Parent_Mistake_Twos_MiscountedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_twos_miscounted = /** @type {((inputs?: Parent_Mistake_Twos_MiscountedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Twos_MiscountedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The twos counted differently")
	return /** @type {LocalizedString} */ ("Inaczej policzone dwójki")
});