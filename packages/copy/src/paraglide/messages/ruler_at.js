/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown>, unit: NonNullable<unknown> }} Ruler_AtInputs */



/**
* | output |
* | --- |
* | "The ruler's zero is {n} {unit} from the left." |
*
* @param {Ruler_AtInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ruler_at = /** @type {((inputs: Ruler_AtInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Ruler_AtInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`The ruler's zero is ${i?.n} ${i?.unit} from the left.`)
	return /** @type {LocalizedString} */ (`Zero linijki przy ${i?.n} ${i?.unit} od lewej`)
});