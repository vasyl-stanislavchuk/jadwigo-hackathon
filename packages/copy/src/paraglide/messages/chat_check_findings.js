/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Chat_Check_FindingsInputs */



/**
* | notes_noun | output |
* | --- | --- |
* | "one" | "{n} note to fix" |
* | "other" | "{n} notes to fix" |
*
* @param {Chat_Check_FindingsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_check_findings = /** @type {((inputs: Chat_Check_FindingsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Check_FindingsInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const notes_noun = registry.plural("en", i?.n, {}, true);
		if (notes_noun === "one") return /** @type {LocalizedString} */ (`${i?.n} note to fix`);
		if (notes_noun === "other") return /** @type {LocalizedString} */ (`${i?.n} notes to fix`);
		return /** @type {LocalizedString} */ ("chat_check_findings");
	}
	{
		const notes_noun = registry.plural("pl", i?.n, {}, true);
		if (notes_noun === "one") return /** @type {LocalizedString} */ (`${i?.n} uwaga do poprawy`);
		if (notes_noun === "few") return /** @type {LocalizedString} */ (`${i?.n} uwagi do poprawy`);
		if (notes_noun === "many") return /** @type {LocalizedString} */ (`${i?.n} uwag do poprawy`);
		if (notes_noun === "other") return /** @type {LocalizedString} */ (`${i?.n} uwagi do poprawy`);
		return /** @type {LocalizedString} */ ("chat_check_findings");
	}
});