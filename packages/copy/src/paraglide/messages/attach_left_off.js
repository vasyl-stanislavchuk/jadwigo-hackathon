/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ max: NonNullable<unknown>, n: NonNullable<unknown> }} Attach_Left_OffInputs */



/**
* | n_noun | output |
* | --- | --- |
* | "one" | "{max} photos fit, {n} was left off" |
* | "other" | "{max} photos fit, {n} were left off" |
*
* @param {Attach_Left_OffInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_left_off = /** @type {((inputs: Attach_Left_OffInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Attach_Left_OffInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const n_noun = registry.plural("en", i?.n, {}, true);
		if (n_noun === "one") return /** @type {LocalizedString} */ (`${i?.max} photos fit, ${i?.n} was left off`);
		if (n_noun === "other") return /** @type {LocalizedString} */ (`${i?.max} photos fit, ${i?.n} were left off`);
		return /** @type {LocalizedString} */ ("attach_left_off");
	}
	{
		const max_noun = registry.plural("pl", i?.max, {}, true);
		if (max_noun === "one") return /** @type {LocalizedString} */ (`Zmieści się ${i?.max} zdjęcie, ${i?.n} pominięto`);
		if (max_noun === "few") return /** @type {LocalizedString} */ (`Zmieszczą się ${i?.max} zdjęcia, ${i?.n} pominięto`);
		if (max_noun === "many") return /** @type {LocalizedString} */ (`Zmieści się ${i?.max} zdjęć, ${i?.n} pominięto`);
		if (max_noun === "other") return /** @type {LocalizedString} */ (`Zmieści się ${i?.max} zdjęcia, ${i?.n} pominięto`);
		return /** @type {LocalizedString} */ ("attach_left_off");
	}
});