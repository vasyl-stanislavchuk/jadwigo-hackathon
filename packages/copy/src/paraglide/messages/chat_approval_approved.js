/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ summary: NonNullable<unknown> }} Chat_Approval_ApprovedInputs */



/**
* | output |
* | --- |
* | "Approved: {summary}" |
*
* @param {Chat_Approval_ApprovedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_approval_approved = /** @type {((inputs: Chat_Approval_ApprovedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Approval_ApprovedInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Approved: ${i?.summary}`)
	return /** @type {LocalizedString} */ (`Zgoda: ${i?.summary}`)
});