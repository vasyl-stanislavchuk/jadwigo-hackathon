/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ name: NonNullable<unknown> }} Chat_Learner_Open_PageInputs */



/**
* | output |
* | --- |
* | "Child's page: {name}" |
*
* @param {Chat_Learner_Open_PageInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_learner_open_page = /** @type {((inputs: Chat_Learner_Open_PageInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Learner_Open_PageInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Child's page: ${i?.name}`)
	return /** @type {LocalizedString} */ (`Strona dziecka: ${i?.name}`)
});