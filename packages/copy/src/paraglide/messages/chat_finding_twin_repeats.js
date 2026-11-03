/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Finding_Twin_RepeatsInputs */



/**
* | output |
* | --- |
* | "The similar question repeats the same sum: the child has already seen its answer." |
*
* @param {Chat_Finding_Twin_RepeatsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_twin_repeats = /** @type {((inputs?: Chat_Finding_Twin_RepeatsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Finding_Twin_RepeatsInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The similar question repeats the same sum: the child has already seen its answer.")
	return /** @type {LocalizedString} */ ("Podobne pytanie powtarza to samo zadanie: dziecko zobaczyło już odpowiedź.")
});