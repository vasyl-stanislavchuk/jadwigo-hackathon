/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Object_Not_HereInputs */



/**
* | output |
* | --- |
* | "This can't be shown here yet." |
*
* @param {Chat_Object_Not_HereInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_object_not_here = /** @type {((inputs?: Chat_Object_Not_HereInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Object_Not_HereInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This can't be shown here yet.")
	return /** @type {LocalizedString} */ ("Tego nie da się jeszcze tu pokazać.")
});