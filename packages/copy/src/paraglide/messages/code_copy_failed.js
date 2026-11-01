/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Code_Copy_FailedInputs */



/**
* | output |
* | --- |
* | "Could not copy. Select the command and copy it by hand." |
*
* @param {Code_Copy_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const code_copy_failed = /** @type {((inputs?: Code_Copy_FailedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Code_Copy_FailedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Could not copy. Select the command and copy it by hand.")
	return /** @type {LocalizedString} */ ("Nie udało się skopiować. Zaznacz polecenie i skopiuj je ręcznie.")
});