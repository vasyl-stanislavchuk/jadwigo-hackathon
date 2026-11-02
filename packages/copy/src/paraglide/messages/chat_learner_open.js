/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ name: NonNullable<unknown> }} Chat_Learner_OpenInputs */



/**
* | output |
* | --- |
* | "Details: {name}" |
*
* @param {Chat_Learner_OpenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_learner_open = /** @type {((inputs: Chat_Learner_OpenInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Learner_OpenInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Details: ${i?.name}`)
	return /** @type {LocalizedString} */ (`Szczegóły: ${i?.name}`)
});