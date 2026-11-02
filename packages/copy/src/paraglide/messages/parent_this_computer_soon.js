/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_This_Computer_SoonInputs */



/**
* | output |
* | --- |
* | "Opening the lesson on this computer is on its way." |
*
* @param {Parent_This_Computer_SoonInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_this_computer_soon = /** @type {((inputs?: Parent_This_Computer_SoonInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_This_Computer_SoonInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Opening the lesson on this computer is on its way.")
	return /** @type {LocalizedString} */ ("Otwieranie lekcji na komputerze jest w drodze.")
});