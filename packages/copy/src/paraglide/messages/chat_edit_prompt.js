/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Edit_PromptInputs */



/**
* | output |
* | --- |
* | "What should change in this step, and why?" |
*
* @param {Chat_Edit_PromptInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_edit_prompt = /** @type {((inputs?: Chat_Edit_PromptInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Edit_PromptInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("What should change in this step, and why?")
	return /** @type {LocalizedString} */ ("Co zmienić w tym kroku i dlaczego?")
});