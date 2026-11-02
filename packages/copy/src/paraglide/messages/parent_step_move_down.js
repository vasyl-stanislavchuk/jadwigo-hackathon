/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Step_Move_DownInputs */



/**
* | output |
* | --- |
* | "Move down" |
*
* @param {Parent_Step_Move_DownInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_step_move_down = /** @type {((inputs?: Parent_Step_Move_DownInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Step_Move_DownInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Move down")
	return /** @type {LocalizedString} */ ("Przenieś niżej")
});