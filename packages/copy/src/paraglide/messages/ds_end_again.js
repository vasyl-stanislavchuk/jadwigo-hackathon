/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Ds_End_AgainInputs */



/**
* | output |
* | --- |
* | "The tricky ones again ({n})" |
*
* @param {Ds_End_AgainInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_end_again = /** @type {((inputs: Ds_End_AgainInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Ds_End_AgainInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`The tricky ones again (${i?.n})`)
	return /** @type {LocalizedString} */ (`Jeszcze raz trudne pytania (${i?.n})`)
});