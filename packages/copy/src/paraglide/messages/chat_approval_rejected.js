/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ summary: NonNullable<unknown> }} Chat_Approval_RejectedInputs */



/**
* | output |
* | --- |
* | "Declined: {summary}" |
*
* @param {Chat_Approval_RejectedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_approval_rejected = /** @type {((inputs: Chat_Approval_RejectedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Approval_RejectedInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Declined: ${i?.summary}`)
	return /** @type {LocalizedString} */ (`Odrzucone: ${i?.summary}`)
});