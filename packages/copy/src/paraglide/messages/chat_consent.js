/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_ConsentInputs */



/**
* | output |
* | --- |
* | "The assistant reads only what your request about your child needs, names included. The model it runs on does not learn from it." |
*
* @param {Chat_ConsentInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_consent = /** @type {((inputs?: Chat_ConsentInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_ConsentInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The assistant reads only what your request about your child needs, names included. The model it runs on does not learn from it.")
	return /** @type {LocalizedString} */ ("Asystent czyta tylko to, czego potrzebuje Twoja prośba o dziecku, imiona też. Model, na którym działa, nie uczy się na tych danych.")
});