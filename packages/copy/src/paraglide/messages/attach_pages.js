/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Attach_PagesInputs */



/**
* | pages_noun | output |
* | --- | --- |
* | "one" | "{n} page" |
* | "other" | "{n} pages" |
*
* @param {Attach_PagesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_pages = /** @type {((inputs: Attach_PagesInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Attach_PagesInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const pages_noun = registry.plural("en", i?.n, {}, true);
		if (pages_noun === "one") return /** @type {LocalizedString} */ (`${i?.n} page`);
		if (pages_noun === "other") return /** @type {LocalizedString} */ (`${i?.n} pages`);
		return /** @type {LocalizedString} */ ("attach_pages");
	}
	{
		const pages_noun = registry.plural("pl", i?.n, {}, true);
		if (pages_noun === "one") return /** @type {LocalizedString} */ (`${i?.n} strona`);
		if (pages_noun === "few") return /** @type {LocalizedString} */ (`${i?.n} strony`);
		if (pages_noun === "many") return /** @type {LocalizedString} */ (`${i?.n} stron`);
		if (pages_noun === "other") return /** @type {LocalizedString} */ (`${i?.n} strony`);
		return /** @type {LocalizedString} */ ("attach_pages");
	}
});