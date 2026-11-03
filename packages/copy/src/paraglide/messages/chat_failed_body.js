/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Chat_Failed_BodyInputs */



/**
* | times_noun | output |
* | --- | --- |
* | "one" | "Jadwigo tried {n} time. Your request is saved, you can try again." |
* | "other" | "Jadwigo tried {n} times. Your request is saved, you can try again." |
*
* @param {Chat_Failed_BodyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_failed_body = /** @type {((inputs: Chat_Failed_BodyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Failed_BodyInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const times_noun = registry.plural("en", i?.n, {}, true);
		if (times_noun === "one") return /** @type {LocalizedString} */ (`Jadwigo tried ${i?.n} time. Your request is saved, you can try again.`);
		if (times_noun === "other") return /** @type {LocalizedString} */ (`Jadwigo tried ${i?.n} times. Your request is saved, you can try again.`);
		return /** @type {LocalizedString} */ ("chat_failed_body");
	}
	{
		const times_noun = registry.plural("pl", i?.n, {}, true);
		if (times_noun === "one") return /** @type {LocalizedString} */ (`Jadwigo próbowała ${i?.n} raz. Twoja prośba jest zapisana, możesz spróbować jeszcze raz.`);
		if (times_noun === "few") return /** @type {LocalizedString} */ (`Jadwigo próbowała ${i?.n} razy. Twoja prośba jest zapisana, możesz spróbować jeszcze raz.`);
		if (times_noun === "many") return /** @type {LocalizedString} */ (`Jadwigo próbowała ${i?.n} razy. Twoja prośba jest zapisana, możesz spróbować jeszcze raz.`);
		if (times_noun === "other") return /** @type {LocalizedString} */ (`Jadwigo próbowała ${i?.n} razy. Twoja prośba jest zapisana, możesz spróbować jeszcze raz.`);
		return /** @type {LocalizedString} */ ("chat_failed_body");
	}
});