/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ from: NonNullable<unknown>, to: NonNullable<unknown>, n: NonNullable<unknown> }} Chat_Week_MetaInputs */



/**
* | lessons_noun | output |
* | --- | --- |
* | "one" | "{from} – {to} · {n} lesson" |
* | "other" | "{from} – {to} · {n} lessons" |
*
* @param {Chat_Week_MetaInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_week_meta = /** @type {((inputs: Chat_Week_MetaInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Week_MetaInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const lessons_noun = registry.plural("en", i?.n, {}, true);
		if (lessons_noun === "one") return /** @type {LocalizedString} */ (`${i?.from} – ${i?.to} · ${i?.n} lesson`);
		if (lessons_noun === "other") return /** @type {LocalizedString} */ (`${i?.from} – ${i?.to} · ${i?.n} lessons`);
		return /** @type {LocalizedString} */ ("chat_week_meta");
	}
	{
		const lessons_noun = registry.plural("pl", i?.n, {}, true);
		if (lessons_noun === "one") return /** @type {LocalizedString} */ (`${i?.from} – ${i?.to} · ${i?.n} lekcja`);
		if (lessons_noun === "few") return /** @type {LocalizedString} */ (`${i?.from} – ${i?.to} · ${i?.n} lekcje`);
		if (lessons_noun === "many") return /** @type {LocalizedString} */ (`${i?.from} – ${i?.to} · ${i?.n} lekcji`);
		if (lessons_noun === "other") return /** @type {LocalizedString} */ (`${i?.from} – ${i?.to} · ${i?.n} lekcji`);
		return /** @type {LocalizedString} */ ("chat_week_meta");
	}
});