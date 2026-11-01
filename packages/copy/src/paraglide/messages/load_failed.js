/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ category: NonNullable<unknown> }} Load_FailedInputs */



/**
* | category | output |
* | --- | --- |
* | "adult" | "This lesson didn't load. Reload the page to try again." |
* | * | "Something got stuck. Ask a grown-up for help." |
*
* @param {Load_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const load_failed = /** @type {((inputs: Load_FailedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Load_FailedInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`This lesson didn't load. Reload the page to try again.`);
		return /** @type {LocalizedString} */ (`Something got stuck. Ask a grown-up for help.`)
	}
	{
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Lekcja się nie wczytała. Odśwież stronę, żeby spróbować ponownie.`);
		return /** @type {LocalizedString} */ (`Coś się zacięło. Poproś rodzica o pomoc.`)
	}
});