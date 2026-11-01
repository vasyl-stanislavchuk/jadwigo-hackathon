/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Attach_ChangedInputs */



/**
* | output |
* | --- |
* | "The photo arrived at a different size than we said it would. Try again" |
*
* @param {Attach_ChangedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_changed = /** @type {((inputs?: Attach_ChangedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Attach_ChangedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The photo arrived at a different size than we said it would. Try again")
	return /** @type {LocalizedString} */ ("Zdjęcie dotarło w innym rozmiarze, niż zapowiadaliśmy. Spróbuj ponownie")
});