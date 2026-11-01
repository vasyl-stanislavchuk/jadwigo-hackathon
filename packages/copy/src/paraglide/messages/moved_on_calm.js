/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Moved_On_CalmInputs */



/**
* | output |
* | --- |
* | "That's fine. Let's look at how it works." |
*
* @param {Moved_On_CalmInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const moved_on_calm = /** @type {((inputs?: Moved_On_CalmInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Moved_On_CalmInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("That's fine. Let's look at how it works.")
	return /** @type {LocalizedString} */ ("To nic. Zobacz, jak to idzie.")
});