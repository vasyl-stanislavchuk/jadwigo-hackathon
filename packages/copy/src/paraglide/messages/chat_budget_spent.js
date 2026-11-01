/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ spent: NonNullable<unknown>, cap: NonNullable<unknown> }} Chat_Budget_SpentInputs */



/**
* | output |
* | --- |
* | "{spent} of {cap} USD" |
*
* @param {Chat_Budget_SpentInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_budget_spent = /** @type {((inputs: Chat_Budget_SpentInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Budget_SpentInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.spent} of ${i?.cap} USD`)
	return /** @type {LocalizedString} */ (`${i?.spent} z ${i?.cap} USD`)
});