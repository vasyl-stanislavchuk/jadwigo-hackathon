/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Answer_Card_FixInputs */



/**
* | output |
* | --- |
* | "Changed your mind? Cross the circle out with an X and fill in the one you choose." |
*
* @param {Answer_Card_FixInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const answer_card_fix = /** @type {((inputs?: Answer_Card_FixInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Answer_Card_FixInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Changed your mind? Cross the circle out with an X and fill in the one you choose.")
	return /** @type {LocalizedString} */ ("Zmieniasz zdanie? Przekreśl kółko znakiem X i zamaluj to, które wybierasz.")
});