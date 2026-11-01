/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Budget_StopInputs */



/**
* | output |
* | --- |
* | "Saved, stopped: I'm not going further, to stay within the limit." |
*
* @param {Chat_Budget_StopInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_budget_stop = /** @type {((inputs?: Chat_Budget_StopInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Budget_StopInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Saved, stopped: I'm not going further, to stay within the limit.")
	return /** @type {LocalizedString} */ ("Zapisane, zatrzymane: dalej nie idę, żeby zmieścić się w limicie.")
});