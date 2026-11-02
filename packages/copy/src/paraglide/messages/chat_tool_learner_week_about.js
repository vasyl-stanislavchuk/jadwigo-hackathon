/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ child: NonNullable<unknown> }} Chat_Tool_Learner_Week_AboutInputs */



/**
* | output |
* | --- |
* | "Reading the week · {child}" |
*
* @param {Chat_Tool_Learner_Week_AboutInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_learner_week_about = /** @type {((inputs: Chat_Tool_Learner_Week_AboutInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Tool_Learner_Week_AboutInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Reading the week · ${i?.child}`)
	return /** @type {LocalizedString} */ (`Czytanie tygodnia · ${i?.child}`)
});