/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Chat_Line_Check_FoundInputs */



/**
* | things_noun | output |
* | --- | --- |
* | "one" | "Checked the lesson: {n} thing to fix" |
* | "other" | "Checked the lesson: {n} things to fix" |
*
* @param {Chat_Line_Check_FoundInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_check_found = /** @type {((inputs: Chat_Line_Check_FoundInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Line_Check_FoundInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const things_noun = registry.plural("en", i?.n, {}, true);
		if (things_noun === "one") return /** @type {LocalizedString} */ (`Checked the lesson: ${i?.n} thing to fix`);
		if (things_noun === "other") return /** @type {LocalizedString} */ (`Checked the lesson: ${i?.n} things to fix`);
		return /** @type {LocalizedString} */ ("chat_line_check_found");
	}
	{
		const things_noun = registry.plural("pl", i?.n, {}, true);
		if (things_noun === "one") return /** @type {LocalizedString} */ (`Sprawdziłam lekcję: ${i?.n} rzecz do poprawy`);
		if (things_noun === "few") return /** @type {LocalizedString} */ (`Sprawdziłam lekcję: ${i?.n} rzeczy do poprawy`);
		if (things_noun === "many") return /** @type {LocalizedString} */ (`Sprawdziłam lekcję: ${i?.n} rzeczy do poprawy`);
		if (things_noun === "other") return /** @type {LocalizedString} */ (`Sprawdziłam lekcję: ${i?.n} rzeczy do poprawy`);
		return /** @type {LocalizedString} */ ("chat_line_check_found");
	}
});