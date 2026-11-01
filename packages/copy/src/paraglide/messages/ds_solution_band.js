/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Ds_Solution_BandInputs */



/**
* | output |
* | --- |
* | "This is what the solution looks like." |
*
* @param {Ds_Solution_BandInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_solution_band = /** @type {((inputs?: Ds_Solution_BandInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Ds_Solution_BandInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This is what the solution looks like.")
	return /** @type {LocalizedString} */ ("Tak wygląda rozwiązanie.")
});