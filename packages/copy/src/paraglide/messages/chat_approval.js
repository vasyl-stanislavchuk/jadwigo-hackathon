/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ summary: NonNullable<unknown> }} Chat_ApprovalInputs */



/**
* | output |
* | --- |
* | "Needs your decision: {summary}" |
*
* @param {Chat_ApprovalInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_approval = /** @type {((inputs: Chat_ApprovalInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_ApprovalInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Needs your decision: ${i?.summary}`)
	return /** @type {LocalizedString} */ (`Czeka na Twoją decyzję: ${i?.summary}`)
});