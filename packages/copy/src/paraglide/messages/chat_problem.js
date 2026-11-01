/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ message: NonNullable<unknown> }} Chat_ProblemInputs */



/**
* | output |
* | --- |
* | "Something went off track: {message}" |
*
* @param {Chat_ProblemInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_problem = /** @type {((inputs: Chat_ProblemInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_ProblemInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Something went off track: ${i?.message}`)
	return /** @type {LocalizedString} */ (`Coś się zacięło: ${i?.message}`)
});