/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Explain_PiecesInputs */



/**
* | output |
* | --- |
* | "The pieces of your explanation" |
*
* @param {Explain_PiecesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const explain_pieces = /** @type {((inputs?: Explain_PiecesInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Explain_PiecesInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The pieces of your explanation")
	return /** @type {LocalizedString} */ ("Części twojego wyjaśnienia")
});