/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Stalled_BodyInputs */



/**
* | output |
* | --- |
* | "You can wait or start this request again. What is already in the lesson stays." |
*
* @param {Chat_Stalled_BodyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_stalled_body = /** @type {((inputs?: Chat_Stalled_BodyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Stalled_BodyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("You can wait or start this request again. What is already in the lesson stays.")
	return /** @type {LocalizedString} */ ("Możesz poczekać albo zacząć tę prośbę od nowa. To, co już jest w lekcji, zostanie.")
});